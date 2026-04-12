import { useRef, useCallback, useEffect, useState } from "react";

interface ColorWheelProps {
  hue: number;
  saturation: number;
  lightness: number;
  onHueChange: (hue: number) => void;
  size?: number;
}

const ColorWheel = ({ hue, saturation, lightness, onHueChange, size = 220 }: ColorWheelProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const radius = size / 2;
  const ringWidth = 28;
  const innerRadius = radius - ringWidth;

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Draw hue ring
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(radius, radius, radius - ringWidth / 2, startAngle, endAngle);
      ctx.lineWidth = ringWidth;
      ctx.strokeStyle = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
      ctx.stroke();
    }

    // Draw center preview circle
    ctx.beginPath();
    ctx.arc(radius, radius, innerRadius - 12, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.fill();

    // Draw selection indicator on the ring
    const indicatorAngle = (hue - 90) * Math.PI / 180;
    const ix = radius + (radius - ringWidth / 2) * Math.cos(indicatorAngle);
    const iy = radius + (radius - ringWidth / 2) * Math.sin(indicatorAngle);
    
    ctx.beginPath();
    ctx.arc(ix, iy, ringWidth / 2 + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, ringWidth / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, saturation, lightness, size, radius, innerRadius, ringWidth]);

  const getHueFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const x = clientX - rect.left - radius;
    const y = clientY - rect.top - radius;
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    onHueChange(Math.round(angle) % 360);
  }, [radius, onHueChange]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    getHueFromEvent(e);
  }, [getHueFromEvent]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      getHueFromEvent(e);
    };
    const handleEnd = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, getHueFromEvent]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-pointer touch-none"
      style={{ width: size, height: size }}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
    />
  );
};

export default ColorWheel;
