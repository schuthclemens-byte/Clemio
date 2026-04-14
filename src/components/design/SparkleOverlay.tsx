import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

/* ── Sparkle particle (quick flash) ── */
interface SparkleParticle {
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

/* ── Soft particle (slow drifting micro-dot) ── */
interface SoftParticle {
  x: number;
  y: number;
  size: number;       // 0.8 – 2.5 px
  alpha: number;
  life: number;
  maxLife: number;     // long: 300–900 frames @30fps → 10–30s
  vx: number;         // drift velocity x (very slow)
  vy: number;         // drift velocity y (always slightly upward)
  active: boolean;
  spawnDelay: number;
}

const SparkleOverlay = memo(({ settings, effectHue, effectSaturation, effectLightness }: SparkleOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

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

    let lastTime = 0;
    const frameDuration = 1000 / 30; // 30 fps cap

    if (isSparkle) {
      /* ════════════════════════════════════════════
         SPARKLE MODE – quick flashing light dots
         ════════════════════════════════════════════ */
      const poolSize = Math.round(12 + intensity * 50);

      const createSparkle = (delayed: boolean): SparkleParticle => ({
        x: Math.random() * w(),
        y: Math.random() * h(),
        size: Math.random() < 0.2 ? 4 + Math.random() * 3 : 1.5 + Math.random() * 2,
        alpha: 0,
        life: 0,
        maxLife: 10 + Math.floor(Math.random() * 16),
        peakTime: 0.12 + Math.random() * 0.13,
        active: !delayed,
        spawnDelay: delayed
          ? Math.floor(Math.random() * Math.max(2, Math.round(30 / (0.5 + intensity * 3))))
          : 0,
      });

      const pool: SparkleParticle[] = Array.from({ length: poolSize }, (_, i) => createSparkle(i > 3));

      const render = (timestamp: number) => {
        if (timestamp - lastTime < frameDuration) {
          animRef.current = requestAnimationFrame(render);
          return;
        }
        lastTime = timestamp;
        ctx.clearRect(0, 0, w(), h());

        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];

          if (!p.active) {
            p.spawnDelay--;
            if (p.spawnDelay <= 0) p.active = true;
            else continue;
          }

          p.life++;
          const lifeRatio = p.life / p.maxLife;

          if (lifeRatio < p.peakTime) {
            const t = lifeRatio / p.peakTime;
            p.alpha = t * t * t * (0.85 + intensity * 0.15);
          } else {
            const t = (lifeRatio - p.peakTime) / (1 - p.peakTime);
            p.alpha = (1 - t * t) * (0.85 + intensity * 0.15);
          }
          p.alpha = Math.max(0, Math.min(p.alpha, 1.0));

          if (p.life >= p.maxLife) {
            pool[i] = createSparkle(true);
            continue;
          }
          if (p.alpha < 0.01) continue;

          const outerR = p.size * 5;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerR);
          grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 0.95})`);
          grad.addColorStop(0.15, `rgba(255, 255, 255, ${p.alpha * 0.6})`);
          grad.addColorStop(0.4, `hsla(${effectHue}, ${Math.min(effectSaturation, 40)}%, 85%, ${p.alpha * 0.25})`);
          grad.addColorStop(1, `hsla(${effectHue}, ${effectSaturation}%, 70%, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          if (p.alpha > 0.2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(p.size * 0.6, 1), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(p.alpha * 1.3, 1.0)})`;
            ctx.fill();
          }
        }

        animRef.current = requestAnimationFrame(render);
      };

      animRef.current = requestAnimationFrame(render);
    } else {
      /* ════════════════════════════════════════════
         SOFT MODE – very subtle drifting micro-dots
         ════════════════════════════════════════════
         Requirements:
         - tiny round dots (1–2.5px)
         - near-white / slight pink tint
         - extremely low opacity (5–10%)
         - slow random drift (slightly upward / diagonal)
         - no blinking, no flashing
         - few particles, not crowded
         - intensity slider controls count + slight visibility
      */

      // Few particles: 6 at 0% intensity → ~22 at 100%
      const poolSize = Math.round(6 + intensity * 16);

      const createSoft = (delayed: boolean): SoftParticle => ({
        x: Math.random() * w(),
        y: Math.random() * h(),
        // Very small: 0.8 – 2.5px
        size: 0.8 + Math.random() * 1.7,
        alpha: 0,
        life: 0,
        // Long life: 300–900 frames → 10–30 seconds at 30fps
        maxLife: 300 + Math.floor(Math.random() * 600),
        // Very slow drift: mostly upward, slight horizontal wander
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.05 + Math.random() * 0.15),   // always drifts up
        active: !delayed,
        spawnDelay: delayed
          ? Math.floor(Math.random() * 60)  // stagger spawns over ~2s
          : 0,
      });

      const pool: SoftParticle[] = Array.from({ length: poolSize }, (_, i) => createSoft(i > 2));

      // Slight warm-white / pinkish tint
      const dotHue = effectHue;
      const dotSat = Math.min(effectSaturation * 0.3, 25); // very desaturated
      const dotLight = 92; // near white

      const render = (timestamp: number) => {
        if (timestamp - lastTime < frameDuration) {
          animRef.current = requestAnimationFrame(render);
          return;
        }
        lastTime = timestamp;
        ctx.clearRect(0, 0, w(), h());

        const ww = w();
        const hh = h();

        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];

          if (!p.active) {
            p.spawnDelay--;
            if (p.spawnDelay <= 0) p.active = true;
            else continue;
          }

          p.life++;
          const lifeRatio = p.life / p.maxLife;

          // Drift position
          p.x += p.vx;
          p.y += p.vy;

          // Smooth fade envelope: slow sine fade-in/out over entire life
          // No blinking — one smooth arc
          const envelope = Math.sin(lifeRatio * Math.PI); // 0→1→0

          // Target opacity: 5–10% range, influenced by intensity
          const baseOpacity = 0.04 + intensity * 0.06;  // 4% → 10%
          p.alpha = envelope * baseOpacity;

          // Recycle if expired or drifted off screen
          if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > ww + 10) {
            pool[i] = createSoft(true);
            pool[i].spawnDelay = Math.floor(Math.random() * 30);
            continue;
          }

          if (p.alpha < 0.005) continue;

          // Simple filled circle — no gradients, no glow, just a dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${dotHue}, ${dotSat}%, ${dotLight}%, ${p.alpha})`;
          ctx.fill();
        }

        animRef.current = requestAnimationFrame(render);
      };

      animRef.current = requestAnimationFrame(render);
    }

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
