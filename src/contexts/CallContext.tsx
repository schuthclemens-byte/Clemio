import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startRingtone, stopRingtone } from "@/lib/sounds";

/* ── Types ── */

export interface CallRecord {
  id: string;
  caller_id: string;
  receiver_id: string;
  conversation_id: string;
  status: string;
  call_type: string;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  missed_at: string | null;
  declined_at: string | null;
}

interface CallerInfo {
  name: string;
  isVideo: boolean;
}

interface CallContextType {
  /** Incoming call waiting to be answered */
  incomingCall: (CallRecord & { callerName: string }) | null;
  /** Currently active call (accepted & in progress) */
  activeCall: CallRecord | null;
  /** Start an outgoing call — returns the call ID or null on error */
  startCall: (conversationId: string, receiverId: string, isVideo: boolean) => Promise<string | null>;
  /** Accept an incoming call */
  acceptCall: () => Promise<void>;
  /** Decline an incoming call */
  declineCall: () => Promise<void>;
  /** End an active call (hang up) */
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
};

const CALL_TIMEOUT_MS = 30_000;

/* ── Provider ── */

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<(CallRecord & { callerName: string }) | null>(null);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneActiveRef = useRef(false);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopRinging = useCallback(() => {
    if (ringtoneActiveRef.current) {
      stopRingtone();
      ringtoneActiveRef.current = false;
    }
  }, []);

  /* ── Global subscription for incoming calls via Realtime postgres_changes ── */
  useEffect(() => {
    if (!user) return;

    console.log("[CallContext] Setting up global call subscription for", user.id);

    const channel = supabase
      .channel("global-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const call = payload.new as CallRecord;
          if (call.status !== "calling") return;

          console.log("[CallContext] Incoming call detected:", call.id);

          // Look up caller name
          let callerName = "Unbekannt";
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, phone_number")
            .eq("id", call.caller_id)
            .maybeSingle();

          if (profile) {
            // Check alias
            const { data: alias } = await supabase
              .from("contact_aliases")
              .select("first_name, last_name")
              .eq("user_id", user.id)
              .eq("contact_user_id", call.caller_id)
              .maybeSingle();

            if (alias?.first_name) {
              callerName = [alias.first_name, alias.last_name].filter(Boolean).join(" ");
            } else {
              callerName = profile.display_name || profile.phone_number;
            }
          }

          setIncomingCall({ ...call, callerName });
          // Start ringtone
          startRingtone();
          ringtoneActiveRef.current = true;
          console.log("[CallContext] Ringtone started for call", call.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          const updated = payload.new as CallRecord;
          // Only care about calls involving us
          if (updated.caller_id !== user.id && updated.receiver_id !== user.id) return;

          console.log("[CallContext] Call updated:", updated.id, "→", updated.status);

          // If this was the incoming call, handle status changes
          setIncomingCall((prev) => {
            if (prev?.id === updated.id) {
              if (["accepted", "declined", "missed", "ended", "failed"].includes(updated.status)) {
                stopRinging();
                clearCallTimeout();
                return null;
              }
            }
            return prev;
          });

          // Update active call — keep terminal status so CallPage can react
          setActiveCall((prev) => {
            if (prev?.id === updated.id) {
              return updated; // Always pass through the latest status
            }
            // If we're the caller and call was accepted, set as active
            if (updated.status === "accepted" && updated.caller_id === user.id) {
              return updated;
            }
            return prev;
          });

          // If we're the caller and call was declined/missed → stop caller UI
          if (updated.caller_id === user.id && ["declined", "missed"].includes(updated.status)) {
            stopRinging();
            clearCallTimeout();
          }
        }
      )
      .subscribe((status) => {
        console.log("[CallContext] Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
      stopRinging();
      clearCallTimeout();
    };
  }, [user, stopRinging, clearCallTimeout]);

  /* ── Start an outgoing call ── */
  const startCallFn = useCallback(
    async (conversationId: string, receiverId: string, isVideo: boolean): Promise<string | null> => {
      if (!user) return null;

      console.log("[CallContext] Starting call to", receiverId, "in conv", conversationId);

      const { data, error } = await supabase
        .from("calls" as any)
        .insert({
          caller_id: user.id,
          receiver_id: receiverId,
          conversation_id: conversationId,
          status: "calling",
          call_type: isVideo ? "video" : "audio",
        })
        .select()
        .single();

      if (error || !data) {
        console.error("[CallContext] Failed to create call record:", error);
        return null;
      }

      const call = data as unknown as CallRecord;
      console.log("[CallContext] Call record created:", call.id);
      setActiveCall(call);

      // Send push notification to receiver
      try {
        await supabase.functions.invoke("notify-incoming-call", {
          body: { conversationId, isVideo, callId: call.id },
        });
        console.log("[CallContext] Push notification sent");
      } catch (e) {
        console.warn("[CallContext] Push notification failed:", e);
      }

      // Set timeout for missed call
      timeoutRef.current = setTimeout(async () => {
        console.log("[CallContext] Call timeout reached for", call.id);

        // Check current status
        const { data: current } = await supabase
          .from("calls" as any)
          .select("status")
          .eq("id", call.id)
          .single();

        const currentStatus = (current as any)?.status;
        if (currentStatus === "calling") {
          // Mark as missed
          await supabase
            .from("calls" as any)
            .update({ status: "missed", missed_at: new Date().toISOString() })
            .eq("id", call.id);

          // Insert missed call system message
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: isVideo ? "📹 Verpasster Videoanruf" : "📞 Verpasster Anruf",
            message_type: "system",
          });

          console.log("[CallContext] Call marked as missed, system message inserted");
          setActiveCall(null);
        }
      }, CALL_TIMEOUT_MS);

      return call.id;
    },
    [user]
  );

  /* ── Accept an incoming call ── */
  const acceptCallFn = useCallback(async () => {
    if (!incomingCall || !user) return;

    console.log("[CallContext] Accepting call", incomingCall.id);
    stopRinging();
    clearCallTimeout();

    const { error } = await supabase
      .from("calls" as any)
      .update({ status: "accepted", answered_at: new Date().toISOString() })
      .eq("id", incomingCall.id);

    if (error) {
      console.error("[CallContext] Failed to accept call:", error);
      return;
    }

    const accepted = { ...incomingCall, status: "accepted", answered_at: new Date().toISOString() };
    setActiveCall(accepted);
    setIncomingCall(null);
    console.log("[CallContext] Call accepted:", accepted.id);
  }, [incomingCall, user, stopRinging, clearCallTimeout]);

  /* ── Decline an incoming call ── */
  const declineCallFn = useCallback(async () => {
    if (!incomingCall || !user) return;

    console.log("[CallContext] Declining call", incomingCall.id);
    stopRinging();
    clearCallTimeout();

    await supabase
      .from("calls" as any)
      .update({ status: "declined", declined_at: new Date().toISOString() })
      .eq("id", incomingCall.id);

    setIncomingCall(null);
    console.log("[CallContext] Call declined");
  }, [incomingCall, user, stopRinging, clearCallTimeout]);

  /* ── End an active call ── */
  const endCallFn = useCallback(async () => {
    if (!activeCall || !user) return;

    console.log("[CallContext] Ending call", activeCall.id);
    stopRinging();
    clearCallTimeout();

    await supabase
      .from("calls" as any)
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", activeCall.id);

    setActiveCall(null);
    console.log("[CallContext] Call ended");
  }, [activeCall, user, stopRinging, clearCallTimeout]);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        activeCall,
        startCall: startCallFn,
        acceptCall: acceptCallFn,
        declineCall: declineCallFn,
        endCall: endCallFn,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
