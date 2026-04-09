import { X, Play, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
    // Fallback: open in new tab
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
        <div className="relative w-full h-full bg-black">
          <video src={url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white/80" />
          </div>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
};

interface MediaMessageProps {
  url: string;
  type: "image" | "video";
  isMine: boolean;
}

export const MediaMessage = ({ url, type, isMine }: MediaMessageProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      {type === "image" ? (
        <img
          src={url}
          alt="Shared image"
          className="rounded-xl max-w-full max-h-64 cursor-pointer object-cover"
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

      {/* Fullscreen image viewer */}
      {fullscreen && type === "image" && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadImage(url); }}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
          <img
            src={url}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};

export default MediaPreview;
