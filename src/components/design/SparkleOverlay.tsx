import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings, SparkleColor } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

interface DriftParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
  type: "dot" | "glow" | "star";
  light: number;
  sat: number;
}

function resolveSparkleColor(
  colorMode: SparkleColor,
  customHue: number,
  themeHue: number,
  themeSat: number,
): { hue: number; sat: number; light: number } {
  // Always use high lightness — particles are white-ish dots
  // Visibility is controlled by alpha, not lightness
  switch (colorMode) {
    case "warm":
      return { hue: 15, sat: 35, light: 95 };
    case "cool":
      return { hue: 220, sat: 30, light: 95 };
    case "accent":
      return { hue: (themeHue + 30) % 360, sat: Math.min(themeSat * 0.4, 40), light: 93 };
    case "custom":
      return { hue: customHue, sat: 25, light: 94 };
    case "auto":
    default:
      return { hue: themeHue, sat: Math.min(themeSat * 0.35, 30), light: 95 };
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

    const isLively = settings.sparkleMode === "lively";
    const intensity = settings.sparkleIntensity / 100;
    const colorMode = settings.sparkleColor ?? "auto";
    const customHue = settings.sparkleCustomHue ?? 0;

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
    const resolved = resolveSparkleColor(colorMode, customHue, effectHue, effectSaturation);

    if (!isLively) {
      /* ════════════════════════════════════════════
         SOFT MODE – static particle texture
         White-ish dots rendered with screen blend mode
         so they glow subtly on any background.
         ════════════════════════════════════════════ */

      const drawParticles = (cw: number, ch: number) => {
        ctx.clearRect(0, 0, cw, ch);
        const count = Math.round(100 + intensity * 250);

        for (let i = 0; i < count; i++) {
          const x = Math.random() * cw;
          const y = Math.random() * ch;
          const light = resolved.light - 5 + Math.random() * 10;
          const sat = Math.max(0, resolved.sat + (Math.random() * 14 - 7));
          const baseAlpha = 0.25 + intensity * 0.30;
          const alpha = baseAlpha * (0.5 + Math.random() * 0.5);
          const roll = Math.random();

          if (roll < 0.12) {
            // ── Star-cross sparkle (rare, ~12%) ──
            const armLen = 2.5 + Math.random() * 2.5;
            const coreR = 0.8 + Math.random() * 0.6;
            // soft glow halo
            const grad = ctx.createRadialGradient(x, y, 0, x, y, armLen * 2.5);
            grad.addColorStop(0, `hsla(${resolved.hue}, ${sat}%, ${light}%, ${alpha * 0.5})`);
            grad.addColorStop(1, `hsla(${resolved.hue}, ${sat}%, ${light}%, 0)`);
            ctx.beginPath();
            ctx.arc(x, y, armLen * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            // cross arms
            ctx.strokeStyle = `hsla(${resolved.hue}, ${Math.min(sat + 8, 50)}%, ${Math.min(light + 3, 100)}%, ${alpha * 0.9})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x - armLen, y); ctx.lineTo(x + armLen, y);
            ctx.moveTo(x, y - armLen); ctx.lineTo(x, y + armLen);
            ctx.stroke();
            // bright core
            ctx.beginPath();
            ctx.arc(x, y, coreR, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${Math.min(sat + 5, 40)}%, ${Math.min(light + 5, 100)}%, ${Math.min(alpha * 1.4, 1)})`;
            ctx.fill();
          } else if (roll < 0.40) {
            // ── Glowing dot (~28%) – dot with radial glow ──
            const coreR = 0.7 + Math.random() * 0.8;
            const glowR = coreR * (3 + Math.random() * 2);
            const grad = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            grad.addColorStop(0, `hsla(${resolved.hue}, ${sat}%, ${Math.min(light + 3, 100)}%, ${alpha * 0.9})`);
            grad.addColorStop(0.35, `hsla(${resolved.hue}, ${sat}%, ${light}%, ${alpha * 0.35})`);
            grad.addColorStop(1, `hsla(${resolved.hue}, ${sat}%, ${light}%, 0)`);
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            // bright center
            ctx.beginPath();
            ctx.arc(x, y, coreR, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${Math.min(sat + 5, 45)}%, ${Math.min(light + 4, 100)}%, ${Math.min(alpha * 1.2, 1)})`;
            ctx.fill();
          } else {
            // ── Simple tiny dot (~60%) ──
            const size = 0.5 + Math.random() * 1.2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${sat}%, ${light}%, ${alpha * 0.7})`;
            ctx.fill();
          }
        }
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
         LIVELY MODE – slow drifting particles, no blinking
         ════════════════════════════════════════════ */

      if (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2) return;

      const count = Math.round(60 + intensity * 180);
      const speedFactor = (settings.sparkleMovementSpeed ?? 30) / 100; // 0–1
      const baseSpeed = 0.08 + speedFactor * 0.35; // px per frame (very slow → moderate)

      const createDrift = (): DriftParticle => {
        const roll = Math.random();
        const light = resolved.light - 5 + Math.random() * 10;
        const sat = Math.max(0, resolved.sat + (Math.random() * 14 - 7));
        const baseAlpha = 0.20 + intensity * 0.30;
        const alpha = baseAlpha * (0.5 + Math.random() * 0.5);
        const angle = Math.random() * Math.PI * 2;
        const speed = baseSpeed * (0.4 + Math.random() * 0.6);
        return {
          x: Math.random() * ww,
          y: Math.random() * hh,
          size: roll < 0.12 ? 2.5 + Math.random() * 2 : roll < 0.4 ? 0.7 + Math.random() * 0.8 : 0.5 + Math.random() * 1.2,
          alpha,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          type: roll < 0.12 ? "star" : roll < 0.4 ? "glow" : "dot",
          light,
          sat,
        };
      };

      const particles: DriftParticle[] = Array.from({ length: count }, () => createDrift());

      let lastTime = 0;
      const frameDuration = 1000 / 30;

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

        for (const p of particles) {
          // Move
          p.x += p.vx;
          p.y += p.vy;
          // Wrap around edges
          if (p.x < -10) p.x = cw + 10;
          if (p.x > cw + 10) p.x = -10;
          if (p.y < -10) p.y = ch + 10;
          if (p.y > ch + 10) p.y = -10;

          if (p.type === "star") {
            const armLen = p.size;
            const coreR = p.size * 0.35;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, armLen * 2.5);
            grad.addColorStop(0, `hsla(${resolved.hue}, ${p.sat}%, ${p.light}%, ${p.alpha * 0.5})`);
            grad.addColorStop(1, `hsla(${resolved.hue}, ${p.sat}%, ${p.light}%, 0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, armLen * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = `hsla(${resolved.hue}, ${Math.min(p.sat + 8, 50)}%, ${Math.min(p.light + 3, 100)}%, ${p.alpha * 0.9})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x - armLen, p.y); ctx.lineTo(p.x + armLen, p.y);
            ctx.moveTo(p.x, p.y - armLen); ctx.lineTo(p.x, p.y + armLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${Math.min(p.sat + 5, 40)}%, ${Math.min(p.light + 5, 100)}%, ${Math.min(p.alpha * 1.4, 1)})`;
            ctx.fill();
          } else if (p.type === "glow") {
            const glowR = p.size * 4;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            grad.addColorStop(0, `hsla(${resolved.hue}, ${p.sat}%, ${Math.min(p.light + 3, 100)}%, ${p.alpha * 0.9})`);
            grad.addColorStop(0.35, `hsla(${resolved.hue}, ${p.sat}%, ${p.light}%, ${p.alpha * 0.35})`);
            grad.addColorStop(1, `hsla(${resolved.hue}, ${p.sat}%, ${p.light}%, 0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${Math.min(p.sat + 5, 45)}%, ${Math.min(p.light + 4, 100)}%, ${Math.min(p.alpha * 1.2, 1)})`;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${resolved.hue}, ${p.sat}%, ${p.light}%, ${p.alpha * 0.7})`;
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

  // screen blend: light particles glow on dark bg
  // soft-light: subtle on light bg
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
        mixBlendMode: "screen",
      }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

export default SparkleOverlay;
