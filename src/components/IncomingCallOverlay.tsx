import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallContext } from "@/contexts/CallContext";
import { useI18n } from "@/contexts/I18nContext";
import { motion, AnimatePresence } from "framer-motion";

const IncomingCallOverlay = () => {
  const navigate = useNavigate();
  const { incomingCall, acceptCall, declineCall } = useCallContext();
  const [elapsed, setElapsed] = useState(0);
  const { locale } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  // Timer counting seconds since call appeared
  useEffect(() => {
    if (!incomingCall) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [incomingCall?.id]);

  // Wake screen: request wake lock while ringing
  useEffect(() => {
    if (!incomingCall) return;
    let wakeLock: WakeLockSentinel | null = null;
    (async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {}
    })();
    return () => { wakeLock?.release().catch(() => {}); };
  }, [incomingCall?.id]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    const { conversation_id, call_type, id } = incomingCall;
    const isVideo = call_type === "video";
    await acceptCall();
    navigate(`/call/${conversation_id}?video=${isVideo}&incoming=true&callId=${id}`);
  }, [incomingCall, acceptCall, navigate]);

  const handleDecline = useCallback(async () => {
    await declineCall();
  }, [declineCall]);

  const isVideo = incomingCall?.call_type === "video";
  const initials = (incomingCall?.callerName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between"
          style={{
            background: "linear-gradient(180deg, hsl(var(--primary) / 0.95) 0%, hsl(0 0% 5% / 0.97) 100%)",
          }}
        >
          {/* Top section */}
          <div className="flex flex-col items-center pt-[max(4rem,env(safe-area-inset-top,2rem))] gap-2">
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-sm font-medium tracking-wide uppercase"
            >
              {isVideo ? tr("Eingehender Videoanruf", "Incoming video call") : tr("Eingehender Anruf", "Incoming call")}
            </motion.p>
          </div>

          {/* Center section: Avatar + Name */}
          <div className="flex flex-col items-center gap-6 -mt-8">
            {/* Animated pulsing rings */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-white/20"
                style={{ width: 128, height: 128, top: -14, left: -14 }}
              />
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute inset-0 rounded-full bg-white/15"
                style={{ width: 128, height: 128, top: -14, left: -14 }}
              />
              <div className="w-[100px] h-[100px] rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                <span className="text-3xl font-bold text-white">{initials}</span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center"
            >
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {incomingCall.callerName}
              </h1>
              <p className="text-white/50 text-sm mt-2">
                {elapsed > 0 ? tr(`Klingelt seit ${elapsed}s…`, `Ringing for ${elapsed}s…`) : tr("Klingelt…", "Ringing…")}
              </p>
            </motion.div>
          </div>

          {/* Bottom action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", damping: 20 }}
            className="flex items-center justify-center gap-16 pb-[max(3rem,env(safe-area-inset-bottom,2rem))]"
          >
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={handleDecline}
                whileTap={{ scale: 0.9 }}
                className="w-[72px] h-[72px] rounded-full bg-red-500 shadow-lg shadow-red-500/40 flex items-center justify-center active:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </motion.button>
              <span className="text-white/60 text-xs font-medium">{tr("Ablehnen", "Decline")}</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                onClick={handleAccept}
                whileTap={{ scale: 0.9 }}
                animate={{
                  boxShadow: [
                    "0 0 0 0px rgba(34,197,94,0.4)",
                    "0 0 0 12px rgba(34,197,94,0)",
                    "0 0 0 0px rgba(34,197,94,0.4)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-[72px] h-[72px] rounded-full bg-green-500 shadow-lg shadow-green-500/40 flex items-center justify-center active:bg-green-600 transition-colors"
              >
                {isVideo ? (
                  <Video className="w-7 h-7 text-white" />
                ) : (
                  <Phone className="w-7 h-7 text-white" />
                )}
              </motion.button>
              <span className="text-white/60 text-xs font-medium">{tr("Annehmen", "Accept")}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallOverlay;
