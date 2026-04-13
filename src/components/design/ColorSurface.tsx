import { useRef, useCallback, useEffect, useState } from "react";

interface ColorSurfaceProps {
  hue: number;
  saturation: number;
  lightness: number;
  onColorChange: (hue: number, saturation: number, lightness: number) => void;
  height?: number;
}

const ColorSurface = ({ hue, saturation, lightness, onColorChange, height = 260 }: ColorSurfaceProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(320);

  // Resize observer for responsive width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Draw the color surface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasWidth < 10) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw horizontal hue gradient
    const hueGrad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
    for (let i = 0; i <= 12; i++) {
      const h = (i / 12) * 360;
      hueGrad.addColorStop(i / 12, `hsl(${h}, 100%, 50%)`);
    }
    ctx.fillStyle = hueGrad;
    ctx.fillRect(0, 0, canvasWidth, height);

    // 2. White overlay (top = white / bright)
    const whiteGrad = ctx.createLinearGradient(0, 0, 0, height);
    whiteGrad.addColorStop(0, "rgba(255,255,255,0.85)");
    whiteGrad.addColorStop(0.5, "rgba(255,255,255,0)");
    whiteGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, canvasWidth, height);

    // 3. Black overlay (bottom = dark)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, height);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(0.5, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, canvasWidth, height);

    // 4. Draw marker
    const mx = (hue / 360) * canvasWidth;
    // Map saturation and lightness to Y position
    // Top = high lightness (bright), Bottom = low lightness (dark)
    // Middle = full saturation
    const my = ((100 - lightness) / 100) * height;

    ctx.beginPath();
    ctx.arc(mx, my, 12, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner fill to show selected color
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.fill();
  }, [hue, saturation, lightness, canvasWidth, height]);

  const getColorFromPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const newHue = Math.round((x / rect.width) * 360) % 360;
    // Y maps to lightness: top = 90 (bright), bottom = 15 (dark)
    const newLightness = Math.round(90 - (y / rect.height) * 75);
    // Saturation derived from Y: middle is most saturated
    const midY = rect.height / 2;
    const distFromMid = Math.abs(y - midY) / midY;
    const newSaturation = Math.round(100 - distFromMid * 40);

    onColorChange(newHue, newSaturation, newLightness);
  }, [onColorChange]);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    getColorFromPosition(clientX, clientY);
  }, [getColorFromPosition]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      getColorFromPosition(clientX, clientY);
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
  }, [dragging, getColorFromPosition]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair touch-none rounded-2xl"
        style={{ height, display: "block" }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      />
    </div>
  );
};

export default ColorSurface;
