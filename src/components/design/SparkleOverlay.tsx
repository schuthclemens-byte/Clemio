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

const SparkleOverlay = memo(({ settings, effectHue, effectSaturation, effectLightness }: SparkleOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const drawnRef = useRef(false);

  useEffect(() => {
    if (!settings.enabled) { drawnRef.current = false; return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isSparkle = settings.sparkleMode === "sparkle";
    const intensity = settings.sparkleIntensity / 100;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ww = window.innerWidth;
    const hh = window.innerHeight;

    if (!isSparkle) {
      /* ════════════════════════════════════════════
         SOFT MODE – static particle texture
         No animation. Drawn once. Like glitter baked into material.
         ════════════════════════════════════════════ */

      ctx.clearRect(0, 0, ww, hh);

      // Density: 40 at 0% → 200 at 100%
      const count = Math.round(40 + intensity * 160);

      // Slight warm-white / pinkish tint
      const dotSat = Math.min(effectSaturation * 0.3, 25);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * ww;
        const y = Math.random() * hh;
        // Size: 0.6 – 2.0px with slight variation
        const size = 0.6 + Math.random() * 1.4;
        // Lightness varies per dot for natural look: 85–97%
        const light = 85 + Math.random() * 12;
        // Opacity: 8–15%, scaled by intensity
        const baseAlpha = 0.08 + intensity * 0.07; // 8% → 15%
        // Slight per-dot variation
        const alpha = baseAlpha * (0.5 + Math.random() * 0.5);

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${effectHue}, ${dotSat}%, ${light}%, ${alpha})`;
        ctx.fill();
      }

      drawnRef.current = true;

      // Redraw on resize
      const onResize = () => {
        const newDpr = Math.min(window.devicePixelRatio, 2);
        canvas.width = window.innerWidth * newDpr;
        canvas.height = window.innerHeight * newDpr;
        ctx.setTransform(newDpr, 0, 0, newDpr, 0, 0);

        const nw = window.innerWidth;
        const nh = window.innerHeight;
        ctx.clearRect(0, 0, nw, nh);

        const resizeCount = Math.round(40 + intensity * 160);
        for (let i = 0; i < resizeCount; i++) {
          const x = Math.random() * nw;
          const y = Math.random() * nh;
          const size = 0.6 + Math.random() * 1.4;
          const light = 85 + Math.random() * 12;
          const baseAlpha = 0.08 + intensity * 0.07;
          const alpha = baseAlpha * (0.5 + Math.random() * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${effectHue}, ${dotSat}%, ${light}%, ${alpha})`;
          ctx.fill();
        }
      };

      window.addEventListener("resize", onResize);
      return () => { window.removeEventListener("resize", onResize); };

    } else {
      /* ════════════════════════════════════════════
         SPARKLE MODE – quick flashing light dots
         ════════════════════════════════════════════ */

      // Skip on very low-end devices
      if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2) return;

      const poolSize = Math.round(12 + intensity * 50);
      let lastTime = 0;
      const frameDuration = 1000 / 30;

      const createSparkle = (delayed: boolean): SparkleParticle => ({
        x: Math.random() * ww,
        y: Math.random() * hh,
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

      const resize = () => {
        const r = Math.min(window.devicePixelRatio, 2);
        canvas.width = window.innerWidth * r;
        canvas.height = window.innerHeight * r;
        ctx.setTransform(r, 0, 0, r, 0, 0);
      };
      window.addEventListener("resize", resize);

      const render = (timestamp: number) => {
        if (timestamp - lastTime < frameDuration) {
          animRef.current = requestAnimationFrame(render);
          return;
        }
        lastTime = timestamp;
        const cw = window.innerWidth;
        const ch = window.innerHeight;
        ctx.clearRect(0, 0, cw, ch);

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

      return () => {
        cancelAnimationFrame(animRef.current);
        window.removeEventListener("resize", resize);
      };
    }
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
