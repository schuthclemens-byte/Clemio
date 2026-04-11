import { X, Play, Download } from "lucide-react";
import { useEffect, useState } from "react";
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

interface FullscreenImageViewerProps {
  url: string;
  onClose: () => void;
}

const FullscreenImageViewer = ({ url, onClose }: FullscreenImageViewerProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Bildvorschau"
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/10 flex items-center justify-center"
        aria-label="Schließen"
      >
        <X className="w-5 h-5 text-background" />
      </button>

      <button
        onClick={(event) => {
          event.stopPropagation();
          downloadImage(url);
        }}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-background/10 flex items-center justify-center"
        aria-label="Herunterladen"
      >
        <Download className="w-5 h-5 text-background" />
      </button>

      <img
        src={url}
        alt="Vollbildansicht"
        className="max-w-full max-h-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body
  );
};

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
