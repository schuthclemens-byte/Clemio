import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { playMessageTone } from "@/lib/sounds";

interface IncomingCall {
  conversationId: string;
  callerName: string;
  isVideo: boolean;
}

/**
 * Global overlay that listens for incoming WebRTC call offers
 * across ALL the user's conversations.
 */
const IncomingCallOverlay = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const ringtoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up ringtone
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current);
      ringtoneRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start ringtone (repeat message tone)
  const startRingtone = useCallback(() => {
    playMessageTone();
    ringtoneRef.current = setInterval(() => {
      playMessageTone();
    }, 2000);
    // Auto-dismiss after 30s
    timeoutRef.current = setTimeout(() => {
      setIncomingCall(null);
      stopRingtone();
    }, 30_000);
  }, [stopRingtone]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const setup = async () => {
      // Get all conversation IDs for this user
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!memberships || !mounted) return;

      const channels: ReturnType<typeof supabase.channel>[] = [];

      for (const m of memberships) {
        const convId = m.conversation_id;
        const channel = supabase.channel(`call-listen-${convId}`, {
          config: { broadcast: { self: false } },
        });

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (!mounted || payload.from === user.id) return;

            // Don't show if already on call page for this conversation
            if (window.location.pathname.includes(`/call/${convId}`)) return;

            // Look up caller name
            let callerName = "Unbekannt";
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, phone_number")
              .eq("id", payload.from)
              .maybeSingle();
            if (profile) {
              // Check for alias
              const { data: alias } = await supabase
                .from("contact_aliases" as any)
                .select("first_name, last_name")
                .eq("user_id", user.id)
                .eq("contact_user_id", payload.from)
                .maybeSingle();
              const a = alias as any;
              if (a?.first_name) {
                callerName = [a.first_name, a.last_name].filter(Boolean).join(" ");
              } else {
                callerName = profile.display_name || profile.phone_number;
              }
            }

            setIncomingCall({
              conversationId: convId,
              callerName,
              isVideo: !!payload.sdp?.sdp?.includes("m=video"),
            });
            startRingtone();
          })
          .on("broadcast", { event: "hang-up" }, ({ payload }) => {
            if (payload.from === user.id) return;
            setIncomingCall((prev) => {
              if (prev?.conversationId === convId) {
                stopRingtone();
                return null;
              }
              return prev;
            });
          })
          .subscribe();

        channels.push(channel);
      }

      channelsRef.current = channels;
    };

    setup();

    return () => {
      mounted = false;
      stopRingtone();
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [user, startRingtone, stopRingtone]);

  const handleAccept = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    const { conversationId, isVideo } = incomingCall;
    setIncomingCall(null);
    navigate(`/call/${conversationId}?video=${isVideo}`);
  }, [incomingCall, navigate, stopRingtone]);

  const handleDecline = useCallback(() => {
    if (!incomingCall) return;
    stopRingtone();
    // Send hang-up to the caller
    const channel = supabase.channel(`call-${incomingCall.conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "hang-up",
          payload: { from: user?.id },
        });
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });
    setIncomingCall(null);
  }, [incomingCall, user]);

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 left-4 right-4 z-[9999] mx-auto max-w-sm"
        >
          <div className="bg-card border border-border rounded-2xl shadow-elevated p-4 space-y-3">
            <div className="flex items-center gap-3">
              {/* Pulsing call icon */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  {incomingCall.isVideo ? (
                    <Video className="w-5 h-5 text-green-500" />
                  ) : (
                    <Phone className="w-5 h-5 text-green-500 animate-pulse" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {incomingCall.callerName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {incomingCall.isVideo ? "Videoanruf" : "Audioanruf"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <PhoneOff className="w-4 h-4" />
                Ablehnen
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 h-11 rounded-xl bg-green-500 text-white font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Phone className="w-4 h-4" />
                Annehmen
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallOverlay;
