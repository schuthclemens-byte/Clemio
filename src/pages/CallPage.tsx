import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Headphones,
  Subtitles,
  ArrowLeft,
  Ear,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebRTC, CallError } from "@/hooks/useWebRTC";
import { useLiveCaptions } from "@/hooks/useLiveCaptions";
import { useAuth } from "@/contexts/AuthContext";
import { useCallContext } from "@/contexts/CallContext";
import { useHeadphoneDetection } from "@/hooks/useHeadphoneDetection";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const CallPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCall, startCall, acceptCall, endCall: endCallContext } = useCallContext();
  const headphonesConnected = useHeadphoneDetection();

  const [chatName, setChatName] = useState("...");
  const [listenOnlyMode, setListenOnlyMode] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<CallError | null>(null);
  const [callPhase, setCallPhase] = useState<"init" | "calling" | "accepted" | "ended" | "error">("init");
  const [endReason, setEndReason] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initDoneRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const webRtcStartedRef = useRef(false);

  const isVideoCall = searchParams.get("video") !== "false";
  const isIncoming = searchParams.get("incoming") === "true";

  const handleCallError = useCallback((error: CallError) => {
    setCallError(error);
    setCallPhase("error");
  }, []);

  const {
    callState,
    isVideoEnabled,
    isAudioEnabled,
    remoteStream,
    localStream,
    startCall: startWebRTC,
    answerCall: answerWebRTC,
    endCall: endWebRTC,
    toggleVideo,
    toggleAudio,
  } = useWebRTC({
    conversationId: conversationId || "",
    userId: user?.id || "",
    onCallError: handleCallError,
  });

  const { isEnabled: captionsEnabled, caption, toggleCaptions } = useLiveCaptions();

  // Load chat name
  useEffect(() => {
    if (!conversationId || !user) return;
    const load = async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("name, is_group")
        .eq("id", conversationId)
        .single();

      if (conv?.name) {
        setChatName(conv.name);
        return;
      }

      const { data: member } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (member) {
        const { data: alias } = await supabase
          .from("contact_aliases")
          .select("first_name, last_name")
          .eq("user_id", user.id)
          .eq("contact_user_id", member.user_id)
          .maybeSingle();

        if (alias?.first_name) {
          setChatName([alias.first_name, alias.last_name].filter(Boolean).join(" "));
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", member.user_id)
          .maybeSingle();
        setChatName(profile?.display_name || "Anruf");
      }
    };
    load();
  }, [conversationId, user]);

  // Initialize call
  useEffect(() => {
    if (!user || !conversationId || initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      if (isIncoming) {
        console.log("[CallPage] Incoming call – accepting and starting WebRTC");

        const { data: pendingCalls } = await supabase
          .from("calls" as any)
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("receiver_id", user.id)
          .eq("status", "calling")
          .order("created_at", { ascending: false })
          .limit(1);

        if (pendingCalls && pendingCalls.length > 0) {
          console.log("[CallPage] Found pending call, accepting:", (pendingCalls[0] as any).id);
          await supabase
            .from("calls" as any)
            .update({ status: "accepted", answered_at: new Date().toISOString() })
            .eq("id", (pendingCalls[0] as any).id);
        }

        setCallPhase("accepted");
        await answerWebRTC(isVideoCall);
      } else {
        console.log("[CallPage] Outgoing call – preparing DB call record");
        setCallPhase("calling");

        const { data: members, error: membersError } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id);

        console.log("[CallPage] Receiver lookup:", { conversationId, userId: user.id, members, membersError });

        const receiverId = members?.[0]?.user_id;
        if (!receiverId) {
          console.error("[CallPage] No receiver found");
          setCallPhase("error");
          setCallError({ code: "unknown", message: "Empfänger nicht gefunden" });
          return;
        }

        const callId = await startCall(conversationId, receiverId, isVideoCall);
        console.log("[CallPage] startCall result", { callId, receiverId, conversationId, isVideoCall });
        if (!callId) {
          setCallPhase("error");
          setCallError({ code: "unknown", message: "Anruf konnte nicht gestartet werden" });
          return;
        }
      }
    };

    init();
  }, []);

  // Watch activeCall for status changes
  useEffect(() => {
    if (!activeCall) return;

    if (activeCall.status === "accepted" && callPhase === "calling") {
      console.log("[CallPage] Call accepted by receiver – starting caller WebRTC now");
      setCallPhase("accepted");

      if (!isIncoming && !webRtcStartedRef.current) {
        webRtcStartedRef.current = true;
        void (async () => {
          await startWebRTC(isVideoCall);
        })();
      }
    }

    if (["declined", "missed", "failed", "ended"].includes(activeCall.status)) {
      if (callPhase !== "ended" && callPhase !== "error") {
        console.log("[CallPage] Call ended with status:", activeCall.status);
        setEndReason(activeCall.status);
        setCallPhase("ended");
        endWebRTC();
      }
    }
  }, [activeCall, callPhase, endWebRTC, isIncoming, startWebRTC, isVideoCall]);

  // Bind local stream to local video element
  // Re-runs whenever localStream or isVideoEnabled changes (camera toggle)
  useEffect(() => {
    if (localVideoRef.current) {
      const stream = localStreamRef();
      if (stream) {
        localVideoRef.current.srcObject = stream;
        console.log("[CallPage] Local video srcObject set", {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
        });
      }
    }
  }, [isVideoEnabled, callState]);

  // Helper to get current local stream from the hook
  function localStreamRef() {
    return localStream;
  }

  // Bind remote stream to video AND audio elements
  useEffect(() => {
    console.log("[CallPage] Remote stream effect:", {
      hasStream: !!remoteStream,
      audioTracks: remoteStream?.getAudioTracks().length,
      videoTracks: remoteStream?.getVideoTracks().length,
      hasVideoRef: !!remoteVideoRef.current,
      hasAudioRef: !!remoteAudioRef.current,
    });

    if (remoteStream) {
      // Always bind audio to a dedicated <audio> element for reliable playback
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => {
          console.warn("[CallPage] Remote audio play blocked:", e.message);
        });
      }

      // Bind video if element exists
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  // Also re-bind when the video element mounts (it's conditionally rendered)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  });

  // Call timer
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Auto-navigate away on ended/error
  useEffect(() => {
    if (callPhase === "ended" || callPhase === "error") {
      const t = setTimeout(() => navigate(-1), 3000);
      return () => clearTimeout(t);
    }
  }, [callPhase, navigate]);

  // Also watch WebRTC callState for "ended" (remote hang-up via broadcast)
  useEffect(() => {
    if ((callState === "ended" || callState === "error") && callPhase === "accepted") {
      if (!cleanedUpRef.current) {
        cleanedUpRef.current = true;
        endCallContext();
      }
      setCallPhase("ended");
      setEndReason("ended");
    }
  }, [callState, callPhase, endCallContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endWebRTC();
    };
  }, []);

  const handleEndCall = useCallback(async () => {
    if (!cleanedUpRef.current) {
      cleanedUpRef.current = true;
      endWebRTC();
      await endCallContext();
    }
    navigate(-1);
  }, [endWebRTC, endCallContext, navigate]);

  const handleListenOnly = useCallback(() => {
    setListenOnlyMode((prev) => {
      const next = !prev;
      if (next) {
        if (isVideoEnabled) toggleVideo();
        if (isAudioEnabled) toggleAudio();
      } else {
        if (!isAudioEnabled) toggleAudio();
      }
      return next;
    });
  }, [isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const initials = chatName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusText = (() => {
    if (callPhase === "error") return callError?.message || "Anruf fehlgeschlagen";
    if (callPhase === "ended") {
      if (endReason === "declined") return "Anruf abgelehnt";
      if (endReason === "missed") return "Keine Antwort";
      return "Beendet";
    }
    if (callPhase === "calling") return "Ruft an…";
    switch (callState) {
      case "calling": return "Verbinde…";
      case "connecting": return "Verbinde…";
      case "connected": return formatDuration(callDuration);
      case "reconnecting": return "Verbindung wird wiederhergestellt…";
      case "ended": return "Beendet";
      case "error": return callError?.message || "Fehler";
      default: return "Verbinde…";
    }
  })();

  const showRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && callState === "connected";

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex flex-col">
      {/* Hidden audio element for remote audio — always mounted */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={handleEndCall}
          className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-primary-foreground font-medium text-sm">{chatName}</p>
          <p className={cn(
            "text-xs",
            (callPhase === "error" || endReason === "declined")
              ? "text-destructive"
              : "text-primary-foreground/50"
          )}>
            {statusText}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {showRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            {callPhase === "error" ? (
              <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">{initials}</span>
              </div>
            )}
            {(callPhase === "calling" || (callPhase === "accepted" && callState !== "connected")) && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </div>
            )}
            {callPhase === "error" && (
              <p className="text-sm text-destructive/80 text-center max-w-xs px-4">
                {callError?.message}
              </p>
            )}
            {callPhase === "ended" && endReason === "declined" && (
              <p className="text-sm text-destructive/80 text-center">Anruf wurde abgelehnt</p>
            )}
            {callPhase === "ended" && endReason === "missed" && (
              <p className="text-sm text-primary-foreground/50 text-center">Keine Antwort</p>
            )}
          </div>
        )}

        {/* Local video (PiP) — always render, hide with CSS when disabled */}
        <div className={cn(
          "absolute bottom-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-primary-foreground/20 shadow-lg transition-opacity",
          isVideoEnabled ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>

        {headphonesConnected && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Headphones className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-accent">Optimiert</span>
          </div>
        )}

        {listenOnlyMode && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-accent/20 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Ear className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-accent font-medium">Nur hören</span>
          </div>
        )}

        <AnimatePresence>
          {captionsEnabled && caption && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-4 right-4 text-center"
            >
              <p className="inline-block bg-foreground/70 backdrop-blur-md text-primary-foreground text-lg font-medium px-5 py-3 rounded-2xl leading-relaxed max-w-lg mx-auto">
                {caption}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control buttons */}
      <div className="pb-10 pt-4 px-4">
        <div className="flex items-center justify-center gap-4">
          <ControlButton
            onClick={handleListenOnly}
            active={listenOnlyMode}
            activeColor="bg-accent"
            icon={<Ear className="w-5 h-5" />}
            label="Nur hören"
          />
          <ControlButton
            onClick={toggleVideo}
            active={!isVideoEnabled}
            icon={isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            label={isVideoEnabled ? "Kamera aus" : "Kamera an"}
          />
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground shadow-lg active:scale-95 transition-transform"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <ControlButton
            onClick={toggleAudio}
            active={!isAudioEnabled}
            icon={isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            label={isAudioEnabled ? "Stumm" : "Laut"}
          />
          <ControlButton
            onClick={toggleCaptions}
            active={captionsEnabled}
            activeColor="bg-accent"
            icon={<Subtitles className="w-5 h-5" />}
            label="Untertitel"
          />
        </div>

        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="text-[10px] text-primary-foreground/40 w-12 text-center">Hören</span>
          <span className="text-[10px] text-primary-foreground/40 w-12 text-center">Video</span>
          <span className="w-16" />
          <span className="text-[10px] text-primary-foreground/40 w-12 text-center">Mikro</span>
          <span className="text-[10px] text-primary-foreground/40 w-12 text-center">Text</span>
        </div>
      </div>
    </div>
  );
};

function ControlButton({
  onClick,
  active,
  activeColor = "bg-primary-foreground/30",
  icon,
  label,
}: {
  onClick: () => void;
  active: boolean;
  activeColor?: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95",
        active ? activeColor + " text-primary-foreground" : "bg-primary-foreground/10 text-primary-foreground/70"
      )}
    >
      {icon}
    </button>
  );
}

export default CallPage;
