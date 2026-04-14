import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
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

  useEffect(() => {
    if (!settings.enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Skip on very low-end devices
    if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2) return;

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

    // More particles for better visibility
    const poolSize = isSparkle
      ? Math.round(12 + intensity * 50)
      : Math.round(6 + intensity * 20);

    const createParticle = (delayed: boolean): Particle => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      size: isSparkle
        ? (Math.random() < 0.2 ? 4 + Math.random() * 3 : 1.5 + Math.random() * 2)
        : 3 + Math.random() * 5,
      alpha: 0,
      life: 0,
      maxLife: isSparkle
        ? 10 + Math.floor(Math.random() * 16) // ~330-860ms at 30fps
        : 120 + Math.floor(Math.random() * 240),
      peakTime: isSparkle
        ? 0.12 + Math.random() * 0.13 // Peak early (12-25%)
        : 0.3,
      active: !delayed,
      spawnDelay: delayed
        ? Math.floor(Math.random() * Math.max(2, Math.round(30 / (0.5 + intensity * 3))))
        : 0,
    });

    poolRef.current = Array.from({ length: poolSize }, (_, i) => createParticle(i > 3));

    let lastTime = 0;
    const frameDuration = 1000 / 30;

    const render = (timestamp: number) => {
      if (timestamp - lastTime < frameDuration) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      lastTime = timestamp;

      ctx.clearRect(0, 0, w(), h());

      const pool = poolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];

        if (!p.active) {
          p.spawnDelay--;
          if (p.spawnDelay <= 0) p.active = true;
          else continue;
        }

        p.life++;
        const lifeRatio = p.life / p.maxLife;

        if (isSparkle) {
          // Sharp flash: fast cubic ramp → bright peak → quick quadratic fade
          if (lifeRatio < p.peakTime) {
            const t = lifeRatio / p.peakTime;
            p.alpha = t * t * t * (0.85 + intensity * 0.15);
          } else {
            const t = (lifeRatio - p.peakTime) / (1 - p.peakTime);
            p.alpha = (1 - t * t) * (0.85 + intensity * 0.15);
          }
        } else {
          // Soft glow: gentle breathing — higher base alpha for visibility
          const baseAlpha = 0.25 + intensity * 0.35;
          if (lifeRatio < 0.12) {
            p.alpha = (lifeRatio / 0.12) * baseAlpha;
          } else if (lifeRatio > 0.88) {
            p.alpha = ((1 - lifeRatio) / 0.12) * baseAlpha;
          } else {
            const breath = Math.sin(lifeRatio * Math.PI * 3) * 0.06;
            p.alpha = baseAlpha + breath;
          }
        }

        p.alpha = Math.max(0, Math.min(p.alpha, 1.0));

        // Recycle when expired
        if (p.life >= p.maxLife) {
          const newP = createParticle(true);
          pool[i] = newP;
          continue;
        }

        if (p.alpha < 0.01) continue;

        // Use white/near-white for maximum contrast against any background
        if (isSparkle) {
          const outerR = p.size * 5;

          // Outer glow ring
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
          grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 0.95})`);
          grad.addColorStop(0.15, `rgba(255, 255, 255, ${p.alpha * 0.6})`);
          grad.addColorStop(0.4, `hsla(${effectHue}, ${Math.min(effectSaturation, 40)}%, 85%, ${p.alpha * 0.25})`);
          grad.addColorStop(1, `hsla(${effectHue}, ${effectSaturation}%, 70%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Bright white center dot for the "pop" / "flash" effect
          if (p.alpha > 0.2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(p.size * 0.6, 1), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(p.alpha * 1.3, 1.0)})`;
            ctx.fill();
          }
        } else {
          // Soft: larger, gentler, colored glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 8);
          grad.addColorStop(0, `hsla(${effectHue}, ${effectSaturation * 0.6}%, 88%, ${p.alpha * 0.6})`);
          grad.addColorStop(0.35, `hsla(${effectHue}, ${effectSaturation * 0.4}%, 85%, ${p.alpha * 0.25})`);
          grad.addColorStop(1, `hsla(${effectHue}, ${effectSaturation * 0.3}%, 80%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 8, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }

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
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 9, opacity: 1 }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

export default SparkleOverlay;
