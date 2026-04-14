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
  size: number;
  alpha: number;
  hueShift: number;
  life: number;
  maxLife: number;
  peakTime: number;
  active: boolean;
  spawnDelay: number;
}

const SparkleOverlay = memo(({ settings, effectHue, effectSaturation, effectLightness }: SparkleOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const poolRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

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

    // Pool size based on intensity
    const poolSize = isSparkle
      ? Math.round(8 + intensity * 40)   // 8-48 sparkle slots
      : Math.round(5 + intensity * 25);  // 5-30 soft glow slots

    const createParticle = (delayed: boolean): Particle => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      size: isSparkle
        ? (Math.random() < 0.15 ? 3 + Math.random() * 3 : 1 + Math.random() * 2) // 85% small, 15% highlight
        : 2 + Math.random() * 4,
      alpha: 0,
      hueShift: (Math.random() - 0.5) * 30,
      life: 0,
      maxLife: isSparkle
        ? 9 + Math.floor(Math.random() * 15)  // 300-800ms at 30fps → 9-24 frames
        : 180 + Math.floor(Math.random() * 360),
      peakTime: isSparkle
        ? 0.15 + Math.random() * 0.15  // Peak at 15-30% of life (early flash)
        : 0.2,
      active: !delayed,
      spawnDelay: delayed ? Math.floor(Math.random() * (isSparkle ? Math.round(60 / (0.3 + intensity * 2)) : 30)) : 0,
    });

    poolRef.current = Array.from({ length: poolSize }, (_, i) => createParticle(i > 2));
    frameRef.current = 0;

    let lastTime = 0;
    const frameDuration = 1000 / 30;

    const render = (timestamp: number) => {
      if (timestamp - lastTime < frameDuration) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastTime = timestamp;
      frameRef.current++;

      ctx.clearRect(0, 0, w(), h());

      poolRef.current.forEach(p => {
        // Handle spawn delay
        if (!p.active) {
          p.spawnDelay--;
          if (p.spawnDelay <= 0) p.active = true;
          else return;
        }

        p.life++;
        const lifeRatio = p.life / p.maxLife;

        if (isSparkle) {
          // SPARKLE: sharp flash then quick fade
          if (lifeRatio < p.peakTime) {
            // Ramp up fast — cubic ease-in
            const t = lifeRatio / p.peakTime;
            p.alpha = t * t * t * (0.7 + intensity * 0.3);
          } else {
            // Quick fade out
            const t = (lifeRatio - p.peakTime) / (1 - p.peakTime);
            p.alpha = (1 - t * t) * (0.7 + intensity * 0.3);
          }
        } else {
          // SOFT GLOW: gentle constant presence with breathing
          if (lifeRatio < 0.15) {
            p.alpha = (lifeRatio / 0.15) * (0.08 + intensity * 0.14);
          } else if (lifeRatio > 0.85) {
            p.alpha = ((1 - lifeRatio) / 0.15) * (0.08 + intensity * 0.14);
          } else {
            const breath = Math.sin(lifeRatio * Math.PI * 4) * 0.03;
            p.alpha = (0.08 + intensity * 0.14) + breath;
          }
        }

        p.alpha = Math.max(0, Math.min(p.alpha, 1.0));

        // Reset when expired
        if (p.life >= p.maxLife) {
          Object.assign(p, createParticle(true));
          return;
        }

        // Skip drawing if invisible
        if (p.alpha < 0.01) return;

        const hue = (effectHue + p.hueShift) % 360;
        const light = Math.max(70, Math.min(98, effectLightness + 30));

        if (isSparkle) {
          // Bright core + soft outer glow
          const outerR = p.size * 4;

          // Outer glow
          const outer = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
          outer.addColorStop(0, `hsla(${hue}, ${Math.min(effectSaturation, 25)}%, ${Math.min(light + 5, 100)}%, ${p.alpha * 0.9})`);
          outer.addColorStop(0.2, `hsla(${hue}, ${effectSaturation * 0.5}%, ${light}%, ${p.alpha * 0.5})`);
          outer.addColorStop(0.5, `hsla(${hue}, ${effectSaturation}%, ${light - 15}%, ${p.alpha * 0.15})`);
          outer.addColorStop(1, `hsla(${hue}, ${effectSaturation}%, ${light - 20}%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
          ctx.fillStyle = outer;
          ctx.fill();

          // Bright center dot for extra "pop"
          if (p.alpha > 0.3) {
            const dotAlpha = Math.min(p.alpha * 1.2, 1.0);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(p.size * 0.5, 0.8), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 10%, 98%, ${dotAlpha})`;
            ctx.fill();
          }
        } else {
          // Soft glow - larger, gentler
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
          gradient.addColorStop(0, `hsla(${hue}, ${effectSaturation * 0.5}%, ${light}%, ${p.alpha * 0.5})`);
          gradient.addColorStop(0.4, `hsla(${hue}, ${effectSaturation * 0.3}%, ${light}%, ${p.alpha * 0.2})`);
          gradient.addColorStop(1, `hsla(${hue}, ${effectSaturation * 0.2}%, ${light}%, 0)`);

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
      style={{ opacity: 0.85 }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

export default SparkleOverlay;
