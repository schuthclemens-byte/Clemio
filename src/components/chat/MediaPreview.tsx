import { X, Play, Download } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const downloadImage = async (url: string) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `clemio-${Date.now()}.${blob.type.includes("png") ? "png" : blob.type.includes("video") ? "mp4" : "jpg"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};

interface MediaPreviewProps {
  file: File;
  type: "image" | "video";
  onRemove: () => void;
}

const MediaPreview = ({ file, type, onRemove }: MediaPreviewProps) => {
  const url = URL.createObjectURL(file);

  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
      {type === "image" ? (
        <img src={url} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="relative w-full h-full bg-foreground">
          <video src={url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-6 h-6 text-background fill-background/80" />
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-foreground/60 flex items-center justify-center"
      >
        <X className="w-3 h-3 text-background" />
      </button>
    </div>
  );
};

/* ─── Pinch-zoom & swipe-to-dismiss helper hook ─── */

interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

function usePinchZoomSwipe(onClose: () => void) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
  const [showControls, setShowControls] = useState(true);

  // Track ongoing gesture state without re-renders
  const gestureRef = useRef({
    // pinch
    initialDistance: 0,
    initialScale: 1,
    // pan (single finger when zoomed, or swipe-to-dismiss)
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isPanning: false,
    initialTx: 0,
    initialTy: 0,
    // swipe dismiss
    swipeDismissing: false,
    // pinch center
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  const getDistance = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gestureRef.current;

    if (e.touches.length === 2) {
      // Pinch start
      g.initialDistance = getDistance(e.touches[0], e.touches[1]);
      g.initialScale = transform.scale;
      g.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      g.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      g.isPanning = false;
    } else if (e.touches.length === 1) {
      g.startX = e.touches[0].clientX;
      g.startY = e.touches[0].clientY;
      g.lastX = g.startX;
      g.lastY = g.startY;
      g.isPanning = true;
      g.initialTx = transform.translateX;
      g.initialTy = transform.translateY;
      g.swipeDismissing = false;
    }
  }, [transform]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gestureRef.current;

    if (e.touches.length === 2) {
      // Pinch zoom
      const dist = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(5, Math.max(0.5, g.initialScale * (dist / g.initialDistance)));
      setTransform((prev) => ({ ...prev, scale: newScale }));
      return;
    }

    if (e.touches.length === 1 && g.isPanning) {
      const dx = e.touches[0].clientX - g.startX;
      const dy = e.touches[0].clientY - g.startY;
      g.lastX = e.touches[0].clientX;
      g.lastY = e.touches[0].clientY;

      if (transform.scale > 1.05) {
        // Pan the zoomed image
        setTransform((prev) => ({
          ...prev,
          translateX: g.initialTx + dx,
          translateY: g.initialTy + dy,
        }));
      } else {
        // Swipe-to-dismiss: only vertical
        g.swipeDismissing = true;
        setTransform((prev) => ({
          ...prev,
          translateY: dy,
          scale: Math.max(0.7, 1 - Math.abs(dy) / 800),
        }));
      }
    }
  }, [transform.scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gestureRef.current;

    // Snap scale back if below 1
    if (transform.scale < 1) {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
    }

    // Swipe dismiss
    if (g.swipeDismissing) {
      const dy = g.lastY - g.startY;
      if (Math.abs(dy) > 120) {
        onClose();
        return;
      }
      // Snap back
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      g.swipeDismissing = false;
    }

    g.isPanning = false;
  }, [transform.scale, onClose]);

  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (transform.scale > 1.05) {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      // Zoom to 2.5x centered on tap position
      const rect = imgRef.current?.getBoundingClientRect();
      if (rect) {
        const touch = e.changedTouches[0];
        const offsetX = touch.clientX - rect.left - rect.width / 2;
        const offsetY = touch.clientY - rect.top - rect.height / 2;
        setTransform({
          scale: 2.5,
          translateX: -offsetX * 1.5,
          translateY: -offsetY * 1.5,
        });
      } else {
        setTransform({ scale: 2.5, translateX: 0, translateY: 0 });
      }
    }
  }, [transform.scale]);

  // Double-tap detection
  const lastTapRef = useRef(0);
  const handleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap(e);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap toggles controls (after a short delay to exclude double-tap)
      setTimeout(() => {
        if (lastTapRef.current !== 0 && Date.now() - lastTapRef.current >= 280) {
          setShowControls((prev) => !prev);
        }
      }, 310);
    }
  }, [handleDoubleTap]);

  const resetTransform = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  return {
    imgRef,
    transform,
    showControls,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: (e: React.TouchEvent) => {
        handleTap(e);
        handleTouchEnd(e);
      },
    },
    resetTransform,
  };
}

/* ─── Fullscreen Image Viewer ─── */

interface FullscreenImageViewerProps {
  url: string;
  onClose: () => void;
}

const FullscreenImageViewer = ({ url, onClose }: FullscreenImageViewerProps) => {
  const { imgRef, transform, showControls, handlers } = usePinchZoomSwipe(onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const opacity = transform.scale <= 1
    ? Math.max(0.3, 1 - Math.abs(transform.translateY) / 400)
    : 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center select-none"
      style={{ backgroundColor: `rgba(0,0,0,${opacity * 0.92})` }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Bildvorschau"
      {...handlers}
    >
      {/* Top controls */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 transition-opacity duration-200"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none" }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); downloadImage(url); }}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Herunterladen"
        >
          <Download className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Schließen"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Image with transform */}
      <img
        ref={imgRef}
        src={url}
        alt="Vollbildansicht"
        className="max-w-full max-h-full object-contain will-change-transform"
        draggable={false}
        style={{
          transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
          transition: transform.scale <= 1 && Math.abs(transform.translateY) < 5
            ? "transform 0.25s ease-out"
            : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
};

/* ─── Media Message (inline in chat) ─── */

interface MediaMessageProps {
  url: string;
  type: "image" | "video";
  isMine: boolean;
}

export const MediaMessage = ({ url, type }: MediaMessageProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      {type === "image" ? (
        <img
          src={url}
          alt="Geteiltes Bild"
          className="rounded-xl max-w-full max-h-64 cursor-zoom-in object-cover"
          onClick={() => setFullscreen(true)}
          loading="lazy"
        />
      ) : (
        <video
          src={url}
          controls
          className="rounded-xl max-w-full max-h-64"
          preload="metadata"
        />
      )}

      {fullscreen && type === "image" && (
        <FullscreenImageViewer url={url} onClose={() => setFullscreen(false)} />
      )}
    </>
  );
};

export default MediaPreview;
