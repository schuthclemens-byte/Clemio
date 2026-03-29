import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, RotateCcw, Circle, Video, Image, Square, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";
import PermissionDialog from "@/components/PermissionDialog";
import { usePermissionGate } from "@/hooks/usePermissionGate";

type CameraMode = "photo" | "video";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, type: "image" | "video") => void;
}

const CameraCapture = ({ open, onClose, onCapture }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<CameraMode>("photo");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const { showDialog, gate, handleAllow, handleCancel } = usePermissionGate("camera");

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraBlocked(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: mode === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraBlocked(true);
      } else {
        console.error("Camera error:", err);
      }
    }
  }, [facingMode, mode]);

  // Gate camera access behind pre-permission dialog
  useEffect(() => {
    if (!open) {
      setPermissionChecked(false);
      return;
    }
    if (permissionChecked) return;

    gate(() => {
      setPermissionChecked(true);
      startCamera();
    });
  }, [open, permissionChecked, gate, startCamera]);

  useEffect(() => {
    if (!open) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    }
  }, [open]);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const flipCamera = () => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
  };

  // Re-start camera when facing mode changes
  useEffect(() => {
    if (open && permissionChecked && !cameraBlocked) {
      startCamera();
    }
  }, [facingMode]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          onCapture(file, "image");
          onClose();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mimeType });
      onCapture(file, "video");
      onClose();
    };
    recorder.start(100);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  // Show pre-permission dialog
  if (showDialog) {
    return (
      <PermissionDialog
        open={true}
        type="camera"
        onAllow={handleAllow}
        onCancel={() => { handleCancel(); onClose(); }}
      />
    );
  }

  // Camera denied fallback
  if (cameraBlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <div className="max-w-sm mx-auto p-6 space-y-5 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <CameraOff className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-white">Kamera blockiert</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Der Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser- oder Geräteeinstellungen und versuche es erneut.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-medium text-sm active:scale-95 transition-transform"
            >
              Schließen
            </button>
            <button
              onClick={() => {
                setCameraBlocked(false);
                startCamera();
              }}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm active:scale-95 transition-transform"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {isRecording && (
          <div className="flex items-center gap-2 bg-destructive/80 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
          </div>
        )}
        <button
          onClick={flipCamera}
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white"
          disabled={isRecording}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            facingMode === "user" && "scale-x-[-1]"
          )}
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 px-6 py-5 pb-8 space-y-4">
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => { if (!isRecording) setMode("photo"); }}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              mode === "photo" ? "text-white" : "text-white/50"
            )}
          >
            <Image className="w-4 h-4" />
            Foto
          </button>
          <button
            onClick={() => { if (!isRecording) setMode("video"); }}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              mode === "video" ? "text-white" : "text-white/50"
            )}
          >
            <Video className="w-4 h-4" />
            Video
          </button>
        </div>

        <div className="flex items-center justify-center">
          {mode === "photo" ? (
            <button
              onClick={takePhoto}
              disabled={!cameraReady}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <Circle className="w-14 h-14 text-white fill-white" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="w-18 h-18 rounded-full border-4 border-destructive flex items-center justify-center active:scale-95 transition-transform"
            >
              <Square className="w-8 h-8 text-destructive fill-destructive rounded-sm" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={!cameraReady}
              className="w-18 h-18 rounded-full border-4 border-destructive flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <Circle className="w-14 h-14 text-destructive fill-destructive" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
