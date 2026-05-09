import { toast } from "sonner";

const guessExtension = (mime: string): string => {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.startsWith("audio/")) return mime.includes("mp4") ? "m4a" : "webm";
  return "jpg";
};

const guessFilename = (mime: string): string => {
  const ext = guessExtension(mime);
  return `clemio-${Date.now()}.${ext}`;
};

/**
 * Download a media file (image / video / audio) to the device.
 * Falls back to opening the URL if blob fetch fails.
 */
export const downloadMedia = async (url: string, suggestedName?: string): Promise<void> => {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = suggestedName || guessFilename(blob.type);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};

/**
 * Open the native share sheet (iOS Share Sheet, Android Share Intent)
 * with the given media file. Falls back to download if Web Share API
 * with files is not supported.
 */
export const shareMedia = async (url: string, suggestedName?: string): Promise<void> => {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const file = new File([blob], suggestedName || guessFilename(blob.type), {
      type: blob.type || "application/octet-stream",
    });

    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (nav.canShare?.({ files: [file] }) && nav.share) {
      await nav.share({ files: [file] });
      return;
    }

    // Fallback: Web Share without files (URL only)
    if (nav.share) {
      try {
        await nav.share({ url });
        return;
      } catch {
        // Ignore; fall through to download
      }
    }

    // Last resort: trigger a download
    await downloadMedia(url, suggestedName);
    toast.info("Teilen nicht verfügbar — Datei heruntergeladen");
  } catch (err: any) {
    if (err?.name === "AbortError") return; // User cancelled
    console.error("[shareMedia] failed", err);
    toast.error("Teilen fehlgeschlagen");
  }
};

export const isShareSupported = (): boolean => {
  return typeof navigator !== "undefined" && typeof (navigator as any).share === "function";
};
