import { useState, useRef } from "react";
import { Mic, Upload, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceCloneUploadProps {
  existingVoice?: { voice_name: string; elevenlabs_voice_id: string } | null;
  onCloned: () => void;
}

const VoiceCloneUpload = ({ existingVoice, onCloned }: VoiceCloneUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Bitte wähle eine Audiodatei aus");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);
      formData.append("name", user.user_metadata?.display_name || "Stimme");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload fehlgeschlagen");
      }

      toast.success("Stimme erfolgreich geklont! 🎉");
      setSelectedFile(null);
      onCloned();
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Klonen der Stimme");
    } finally {
      setUploading(false);
    }
  };

  if (existingVoice) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[0.938rem]">Stimme aktiv</p>
            <p className="text-xs text-muted-foreground">
              Deine geklonte Stimme "{existingVoice.voice_name}" ist einsatzbereit
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Mic className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-[0.938rem]">Stimme klonen</p>
          <p className="text-xs text-muted-foreground">
            Lade eine Sprachnachricht hoch (min. 30 Sek.)
          </p>
        </div>
      </div>

      {selectedFile ? (
        <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
          <Mic className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="text-sm truncate flex-1">{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1.5 rounded-lg hover:bg-background transition-colors"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 h-12 rounded-xl bg-secondary text-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors active:scale-[0.97] disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Datei wählen
        </button>

        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 shadow-soft hover:shadow-elevated transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Stimme klonen</>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default VoiceCloneUpload;
