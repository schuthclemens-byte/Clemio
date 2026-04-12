import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

const speedMap = { slow: 0.15, medium: 0.35, fast: 0.6 };
const sizeMap = { small: 1.5, medium: 3, large: 5 };

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  hueShift: number;
  life: number;
  maxLife: number;
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

    // Skip on low-end devices
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

    const speed = speedMap[settings.sparkleSpeed];
    const baseSize = sizeMap[settings.sparkleSize];
    // Fewer particles – max 30, scaled by intensity
    const count = Math.round(
      Math.min(settings.sparkleDensity, 30) * (settings.sparkleIntensity / 100 + 0.15)
    );

    particlesRef.current = Array.from({ length: Math.min(count, 30) }, () =>
      createParticle(w(), h(), baseSize, speed)
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

        // Smooth fade-in / fade-out lifecycle
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.3) {
          p.alpha = (lifeRatio / 0.3) * 0.3;
        } else if (lifeRatio > 0.7) {
          p.alpha = ((1 - lifeRatio) / 0.3) * 0.3;
        } else {
          p.alpha = 0.3;
        }

        // Max opacity capped at 0.4 (subtle, not flashy)
        p.alpha = Math.min(p.alpha, 0.4);

        // Reset if off-screen or expired
        if (p.life >= p.maxLife || p.x < -20 || p.x > w() + 20 || p.y < -20 || p.y > h() + 20) {
          Object.assign(p, createParticle(w(), h(), baseSize, speed));
        }

        const hue = (effectHue + p.hueShift) % 360;
        const light = Math.max(30, Math.min(75, effectLightness + (Math.random() - 0.5) * 10));

        // Soft glow – single radial gradient, no harsh core
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `hsla(${hue}, ${effectSaturation}%, ${light}%, ${p.alpha * 0.8})`);
        gradient.addColorStop(0.4, `hsla(${hue}, ${effectSaturation}%, ${light}%, ${p.alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue}, ${effectSaturation}%, ${light}%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
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
      style={{ opacity: 0.6 }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

function createParticle(w: number, h: number, baseSize: number, speed: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * speed * 0.3,
    vy: (Math.random() - 0.5) * speed * 0.3 - 0.05,
    size: baseSize * (0.5 + Math.random() * 0.5),
    alpha: 0,
    hueShift: (Math.random() - 0.5) * 20,
    life: Math.floor(Math.random() * 100), // stagger starts
    maxLife: 250 + Math.random() * 300,
  };
}

export default SparkleOverlay;
