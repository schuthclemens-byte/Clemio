import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallContext } from "@/contexts/CallContext";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Global overlay that shows incoming calls.
 * Listens to CallContext which tracks calls via the `calls` DB table + Realtime.
 */
const IncomingCallOverlay = () => {
  const navigate = useNavigate();
  const { incomingCall, acceptCall, declineCall } = useCallContext();

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

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="bg-card border border-border rounded-3xl shadow-elevated p-8 space-y-6 max-w-sm w-full mx-4">
            {/* Call icon with pulse */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  {incomingCall.call_type === "video" ? (
                    <Video className="w-8 h-8 text-green-500" />
                  ) : (
                    <Phone className="w-8 h-8 text-green-500 animate-pulse" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
              </div>

              <div className="text-center">
                <p className="font-bold text-xl text-foreground">
                  {incomingCall.callerName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {incomingCall.call_type === "video"
                    ? "Eingehender Videoanruf"
                    : "Eingehender Anruf"}
                </p>
              </div>
            </div>

            {/* Accept / Decline buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleDecline}
                className="flex-1 h-14 rounded-2xl bg-destructive text-destructive-foreground font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <PhoneOff className="w-5 h-5" />
                Ablehnen
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 h-14 rounded-2xl bg-green-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Phone className="w-5 h-5" />
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
