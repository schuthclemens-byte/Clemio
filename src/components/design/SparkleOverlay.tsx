import { useEffect, useRef, memo } from "react";
import type { MagicModeSettings } from "@/contexts/DesignSystemContext";

interface SparkleOverlayProps {
  settings: MagicModeSettings;
  effectHue: number;
  effectSaturation: number;
  effectLightness: number;
}

const speedMap = { slow: 0.3, medium: 0.7, fast: 1.2 };
const sizeMap = { small: 2, medium: 4, large: 7 };

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  alphaDir: number;
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

    // Check for low-end device
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
    const count = Math.round(settings.sparkleDensity * (settings.sparkleIntensity / 100 + 0.3));

    // Initialize particles
    particlesRef.current = Array.from({ length: Math.min(count, 60) }, () => createParticle(w(), h(), baseSize, speed));

    let lastTime = 0;
    const frameDuration = 1000 / 30; // cap at 30fps

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

        // Fade in/out lifecycle
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.2) {
          p.alpha = (lifeRatio / 0.2) * 0.5;
        } else if (lifeRatio > 0.8) {
          p.alpha = ((1 - lifeRatio) / 0.2) * 0.5;
        }

        // Reset if off-screen or life expired
        if (p.life >= p.maxLife || p.x < -20 || p.x > w() + 20 || p.y < -20 || p.y > h() + 20) {
          Object.assign(p, createParticle(w(), h(), baseSize, speed));
        }

        const hue = (effectHue + p.hueShift) % 360;
        const light = Math.max(20, Math.min(80, effectLightness + (Math.random() - 0.5) * 20));
        
        // Glow effect
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${hue}, ${effectSaturation}%, ${light}%, ${p.alpha * 0.6})`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${effectSaturation}%, ${light}%, ${p.alpha * 0.2})`);
        gradient.addColorStop(1, `hsla(${hue}, ${effectSaturation}%, ${light}%, 0)`);
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core sparkle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${effectSaturation}%, ${Math.min(light + 20, 95)}%, ${p.alpha})`;
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
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
});

SparkleOverlay.displayName = "SparkleOverlay";

function createParticle(w: number, h: number, baseSize: number, speed: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * speed * 0.5,
    vy: (Math.random() - 0.5) * speed * 0.5 - 0.1,
    size: baseSize * (0.5 + Math.random()),
    alpha: 0,
    alphaDir: 1,
    hueShift: (Math.random() - 0.5) * 36, // ±10% hue range (±18deg)
    life: 0,
    maxLife: 150 + Math.random() * 200,
  };
}

export default SparkleOverlay;
