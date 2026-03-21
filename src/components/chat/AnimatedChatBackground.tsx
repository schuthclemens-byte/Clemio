import { useEffect, useRef } from "react";

interface AnimatedChatBackgroundProps {
  animation: string; // "aurora" | "particles" | "waves" | "nebula"
}

const AnimatedChatBackground = ({ animation }: AnimatedChatBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;
    let t = 0;

    const drawAurora = () => {
      ctx.clearRect(0, 0, w(), h());
      for (let i = 0; i < 3; i++) {
        const gradient = ctx.createLinearGradient(0, 0, w(), h());
        const hue1 = (t * 0.3 + i * 60) % 360;
        const hue2 = (hue1 + 40) % 360;
        gradient.addColorStop(0, `hsla(${hue1}, 70%, 60%, 0.08)`);
        gradient.addColorStop(0.5, `hsla(${hue2}, 60%, 50%, 0.12)`);
        gradient.addColorStop(1, `hsla(${hue1}, 70%, 60%, 0.05)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const yOff = Math.sin(t * 0.01 + i * 2) * h() * 0.15;
        ctx.ellipse(w() / 2, h() * 0.4 + yOff + i * 60, w() * 0.8, h() * 0.25, Math.sin(t * 0.005 + i) * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    if (animation === "particles") {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * 500, y: Math.random() * 900,
          vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.5 - 0.1,
          size: Math.random() * 3 + 1, alpha: Math.random() * 0.4 + 0.1,
        });
      }
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, w(), h());
      // Soft background tint
      ctx.fillStyle = "hsla(var(--primary), 0.03)";
      ctx.fillRect(0, 0, w(), h());
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = h() + 10; p.x = Math.random() * w(); }
        if (p.x < -10 || p.x > w() + 10) p.x = Math.random() * w();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(var(--primary), ${p.alpha})`;
        ctx.fill();
      });
    };

    const drawWaves = () => {
      ctx.clearRect(0, 0, w(), h());
      for (let wave = 0; wave < 4; wave++) {
        ctx.beginPath();
        const alpha = 0.04 + wave * 0.02;
        ctx.fillStyle = `hsla(var(--primary), ${alpha})`;
        for (let x = 0; x <= w(); x += 2) {
          const y = h() * (0.5 + wave * 0.1) + Math.sin(x * 0.008 + t * 0.015 + wave * 1.5) * 30 + Math.sin(x * 0.003 + t * 0.008) * 20;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.lineTo(w(), h());
        ctx.lineTo(0, h());
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawNebula = () => {
      ctx.clearRect(0, 0, w(), h());
      for (let i = 0; i < 5; i++) {
        const x = w() * (0.2 + 0.15 * i) + Math.sin(t * 0.008 + i * 1.3) * 60;
        const y = h() * (0.3 + 0.1 * i) + Math.cos(t * 0.006 + i * 0.9) * 40;
        const r = 120 + Math.sin(t * 0.01 + i) * 30;
        const hue = (t * 0.2 + i * 50) % 360;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `hsla(${hue}, 60%, 55%, 0.1)`);
        gradient.addColorStop(1, `hsla(${hue}, 60%, 55%, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };

    const render = () => {
      t++;
      switch (animation) {
        case "aurora": drawAurora(); break;
        case "particles": drawParticles(); break;
        case "waves": drawWaves(); break;
        case "nebula": drawNebula(); break;
      }
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [animation]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
    />
  );
};

export default AnimatedChatBackground;
