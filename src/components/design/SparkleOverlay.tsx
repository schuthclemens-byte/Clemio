import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings, SparkleColor } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

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

function resolveSparkleColor(
  colorMode: SparkleColor,
  customHue: number,
  themeHue: number,
  themeSat: number,
  isDark: boolean,
): { hue: number; sat: number; light: number } {
  // In dark mode, particles should be lighter; in light mode, darker
  // This ensures contrast against both backgrounds
  const baseLightness = isDark ? 90 : 40;

  switch (colorMode) {
    case "warm":
      return { hue: 15, sat: Math.min(themeSat * 0.4, 35), light: baseLightness };
    case "cool":
      return { hue: 220, sat: Math.min(themeSat * 0.35, 30), light: baseLightness };
    case "accent":
      return { hue: (themeHue + 30) % 360, sat: Math.min(themeSat * 0.45, 40), light: baseLightness };
    case "custom":
      return { hue: customHue, sat: 25, light: baseLightness };
    case "auto":
    default:
      return { hue: themeHue, sat: Math.min(themeSat * 0.35, 30), light: baseLightness };
  }
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

    const isSparkle = settings.sparkleMode === "sparkle";
    const intensity = settings.sparkleIntensity / 100;
    const colorMode = settings.sparkleColor ?? "auto";
    const customHue = settings.sparkleCustomHue ?? 0;
    const isDark = document.documentElement.classList.contains("dark");

    const dpr = Math.min(window.devicePixelRatio, 2);

    const setupCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    const { w: ww, h: hh } = setupCanvas();

    const resolved = resolveSparkleColor(colorMode, customHue, effectHue, effectSaturation, isDark);

    if (!isSparkle) {
      /* ════════════════════════════════════════════
         SOFT MODE – static particle texture
         Particles need contrast against background:
         - Dark mode: light/white particles
         - Light mode: darker, slightly tinted particles
         ════════════════════════════════════════════ */

      const drawParticles = (cw: number, ch: number) => {
        ctx.clearRect(0, 0, cw, ch);
        // 60 at 0% intensity → 250 at 100%
        const count = Math.round(60 + intensity * 190);

        for (let i = 0; i < count; i++) {
          const x = Math.random() * cw;
          const y = Math.random() * ch;
          // Size: 1–3px for visibility
          const size = 1 + Math.random() * 2;
          // Per-dot lightness variation
          const light = resolved.light + (Math.random() * 16 - 8);
          // Per-dot saturation variation
          const sat = Math.max(0, resolved.sat + (Math.random() * 14 - 7));
          // Opacity: 12–25% base, scaled by intensity
          const baseAlpha = 0.12 + intensity * 0.13; // 12% → 25%
          const alpha = baseAlpha * (0.6 + Math.random() * 0.4);

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${resolved.hue}, ${sat}%, ${light}%, ${alpha})`;
          ctx.fill();
        }

        console.log(`[SparkleOverlay] Soft mode drew ${count} particles on ${cw}x${ch}, isDark=${isDark}, hue=${resolved.hue}, light=${resolved.light}, baseAlpha=${(0.12 + intensity * 0.13).toFixed(2)}`);
      };

      drawParticles(ww, hh);

      const onResize = () => {
        const { w, h } = setupCanvas();
        drawParticles(w, h);
      };

      window.addEventListener("resize", onResize);
      return () => { window.removeEventListener("resize", onResize); };

    } else {
      /* ════════════════════════════════════════════
         SPARKLE MODE – quick flashing light dots
         ════════════════════════════════════════════ */

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

      const onResize = () => { setupCanvas(); };
      window.addEventListener("resize", onResize);

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
          grad.addColorStop(0.4, `hsla(${resolved.hue}, ${Math.min(resolved.sat + 10, 40)}%, 85%, ${p.alpha * 0.25})`);
          grad.addColorStop(1, `hsla(${resolved.hue}, ${resolved.sat}%, 70%, 0)`);
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
        window.removeEventListener("resize", onResize);
      };
    }
  }, [settings, effectHue, effectSaturation, effectLightness]);

  if (!settings.enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 5,
        mixBlendMode: settings.sparkleMode === "soft" ? "multiply" : "screen",
      }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

export default SparkleOverlay;
