import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  hueShift: number;
  life: number;
  maxLife: number;
  peakTime: number; // 0-1 ratio of maxLife when peak brightness hits
}

const SparkleOverlay = memo(({ settings, effectHue, effectSaturation, effectLightness }: SparkleOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!settings.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isLowEnd = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    if (isLowEnd) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const isSparkle = settings.sparkleMode === "sparkle";
    const intensity = settings.sparkleIntensity / 100;

    // Particle count: 5-35 based on intensity
    const count = Math.round(5 + intensity * 30);

    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(w(), h(), isSparkle)
    );

    let lastTime = 0;
    const frameDuration = 1000 / 30;

    const render = (timestamp: number) => {
      if (timestamp - lastTime < frameDuration) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastTime = timestamp;

      ctx.clearRect(0, 0, w(), h());

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeRatio = p.life / p.maxLife;

        if (isSparkle) {
          // SPARKLE MODE: quick bright flash then fade
          if (lifeRatio < p.peakTime) {
            // Ramp up to peak
            const rampUp = lifeRatio / p.peakTime;
            p.alpha = rampUp * rampUp * (0.5 + intensity * 0.4);
          } else {
            // Fade out from peak
            const fadeOut = (1 - lifeRatio) / (1 - p.peakTime);
            p.alpha = fadeOut * (0.5 + intensity * 0.4);
          }
        } else {
          // SOFT GLOW MODE: gentle constant presence
          if (lifeRatio < 0.2) {
            p.alpha = (lifeRatio / 0.2) * (0.12 + intensity * 0.18);
          } else if (lifeRatio > 0.8) {
            p.alpha = ((1 - lifeRatio) / 0.2) * (0.12 + intensity * 0.18);
          } else {
            // Gentle breathing effect
            const breath = Math.sin(lifeRatio * Math.PI * 3) * 0.04;
            p.alpha = (0.12 + intensity * 0.18) + breath;
          }
        }

        p.alpha = Math.max(0, Math.min(p.alpha, 0.8));

        // Reset if off-screen or expired
        if (p.life >= p.maxLife || p.x < -20 || p.x > w() + 20 || p.y < -20 || p.y > h() + 20) {
          Object.assign(p, createParticle(w(), h(), isSparkle));
        }

        const hue = (effectHue + p.hueShift) % 360;
        const light = Math.max(60, Math.min(92, effectLightness + 20));

        if (isSparkle) {
          // Sharp sparkle with bright core
          const innerGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          innerGlow.addColorStop(0, `hsla(${hue}, ${Math.min(effectSaturation, 30)}%, ${light}%, ${p.alpha})`);
          innerGlow.addColorStop(0.3, `hsla(${hue}, ${effectSaturation}%, ${light - 10}%, ${p.alpha * 0.5})`);
          innerGlow.addColorStop(1, `hsla(${hue}, ${effectSaturation}%, ${light - 20}%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = innerGlow;
          ctx.fill();
        } else {
          // Soft glow - larger, gentler
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
          gradient.addColorStop(0, `hsla(${hue}, ${effectSaturation * 0.6}%, ${light}%, ${p.alpha * 0.6})`);
          gradient.addColorStop(0.4, `hsla(${hue}, ${effectSaturation * 0.4}%, ${light}%, ${p.alpha * 0.25})`);
          gradient.addColorStop(1, `hsla(${hue}, ${effectSaturation * 0.3}%, ${light}%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [settings, effectHue, effectSaturation, effectLightness]);

  if (!settings.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 no-color-transition"
      style={{ opacity: 0.7 }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

function createParticle(w: number, h: number, isSparkle: boolean): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: isSparkle ? (Math.random() - 0.5) * 0.15 : (Math.random() - 0.5) * 0.06,
    vy: isSparkle ? (Math.random() - 0.5) * 0.15 - 0.02 : (Math.random() - 0.5) * 0.04 - 0.01,
    size: isSparkle
      ? 1 + Math.random() * 3  // 1-4px for sparkle
      : 2 + Math.random() * 4, // 2-6px for soft glow
    alpha: 0,
    hueShift: (Math.random() - 0.5) * 30,
    life: Math.floor(Math.random() * 60),
    maxLife: isSparkle
      ? 20 + Math.random() * 50   // 300-1200ms at 30fps → ~10-40 frames
      : 200 + Math.random() * 400, // Long-lived for soft glow
    peakTime: 0.15 + Math.random() * 0.25, // Peak at 15-40% of life
  };
}

export default SparkleOverlay;
