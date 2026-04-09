import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Film, Mic2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AudioPlayer from "./AudioPlayer";

interface MediaItem {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  mediaUrl?: string;
}

interface MediaGallerySheetProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
}

type TabType = "images" | "videos" | "audio";

const MediaGallerySheet = ({ open, onClose, conversationId }: MediaGallerySheetProps) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("images");
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, message_type, created_at")
        .eq("conversation_id", conversationId)
        .in("message_type", ["image", "video", "audio", "voice"])
        .order("created_at", { ascending: false });

      if (data) {
        const mapped: MediaItem[] = await Promise.all(
          data.map(async (m) => {
            let mediaUrl = m.content;
            // If content is a storage path, create signed URL
            if (!m.content.startsWith("http")) {
              const { data: signed } = await supabase.storage
                .from("chat-media")
                .createSignedUrl(m.content, 7 * 24 * 60 * 60);
              if (signed?.signedUrl) mediaUrl = signed.signedUrl;
            }
            return {
              id: m.id,
              content: m.content,
              messageType: m.message_type || "image",
              createdAt: m.created_at || "",
              mediaUrl,
            };
          })
        );
        setItems(mapped);
      }
      setLoading(false);
    })();
  }, [open, conversationId]);

  if (!open) return null;

  const filtered = items.filter((item) => {
    if (tab === "images") return item.messageType === "image";
    if (tab === "videos") return item.messageType === "video";
    return item.messageType === "audio" || item.messageType === "voice";
  });

  const tabs: { key: TabType; label: string; icon: typeof ImageIcon }[] = [
    { key: "images", label: "Bilder", icon: ImageIcon },
    { key: "videos", label: "Videos", icon: Film },
    { key: "audio", label: "Audio", icon: Mic2 },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
        <div className="w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <h2 className="text-lg font-bold">Medien</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                Keine Medien in dieser Kategorie
              </p>
            ) : tab === "audio" ? (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-secondary/50">
                    <AudioPlayer url={item.mediaUrl || item.content} isMine={false} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFullscreenUrl(item.mediaUrl || item.content)}
                    className="aspect-square rounded-lg overflow-hidden bg-secondary/50 hover:opacity-90 transition-opacity"
                  >
                    {item.messageType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-secondary">
                        <Film className="w-8 h-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={item.mediaUrl || item.content}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen preview */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            onClick={() => setFullscreenUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={fullscreenUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};

export default MediaGallerySheet;
