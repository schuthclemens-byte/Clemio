import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startRingtone, stopRingtone } from "@/lib/sounds";
import { fetchAccessibleProfile } from "@/lib/accessibleProfiles";

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

interface CallContextType {
  incomingCall: (CallRecord & { callerName: string }) | null;
  activeCall: CallRecord | null;
  startCall: (conversationId: string, receiverId: string, isVideo: boolean) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
};

const CALL_TIMEOUT_MS = 30_000;
const RECONCILE_INTERVAL_MS = 5_000;

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<(CallRecord & { callerName: string }) | null>(null);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringtoneActiveRef = useRef(false);
  const handledIncomingIdsRef = useRef<Set<string>>(new Set());

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

  const resolveCallerName = useCallback(async (call: CallRecord) => {
    if (!user) return "Unbekannt";

    let callerName = "Unbekannt";
    const profile = await fetchAccessibleProfile(call.caller_id);

    console.log("[CallContext] Caller profile lookup:", { callId: call.id, profile });

    if (profile) {
      const { data: alias, error: aliasError } = await supabase
        .from("contact_aliases")
        .select("first_name, last_name")
        .eq("user_id", user.id)
        .eq("contact_user_id", call.caller_id)
        .maybeSingle();

      console.log("[CallContext] Caller alias lookup:", { callId: call.id, alias, aliasError });

      if (alias?.first_name) {
        callerName = [alias.first_name, alias.last_name].filter(Boolean).join(" ");
      } else {
        callerName = profile.display_name || "Unbekannt";
      }
    }

    return callerName;
  }, [user]);

  const showIncomingCall = useCallback(async (call: CallRecord, source: string) => {
    if (!user || call.receiver_id !== user.id || call.status !== "calling") return;

    if (handledIncomingIdsRef.current.has(call.id) && incomingCall?.id === call.id) {
      console.log("[CallContext] Incoming call already visible:", { callId: call.id, source });
      return;
    }

    handledIncomingIdsRef.current.add(call.id);
    const callerName = await resolveCallerName(call);

    console.log("[CallContext] Showing incoming call overlay:", {
      source,
      callId: call.id,
      callerId: call.caller_id,
      receiverId: call.receiver_id,
      conversationId: call.conversation_id,
      callType: call.call_type,
      callerName,
    });

    setIncomingCall({ ...call, callerName });
    startRingtone();
    ringtoneActiveRef.current = true;
    console.log("[CallContext] overlay visible yes", { currentIncomingCall: call.id });
  }, [user, resolveCallerName, incomingCall?.id]);

  const insertMissedCallMessage = useCallback(async (call: CallRecord) => {
    if (!user) return;

    console.log("[CallContext] Missed call message insert attempt:", {
      callId: call.id,
      conversationId: call.conversation_id,
      senderId: user.id,
      messageType: "system",
      content: call.call_type === "video" ? "📹 Verpasster Videoanruf" : "📞 Verpasster Anruf",
    });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: call.conversation_id,
        sender_id: user.id,
        content: call.call_type === "video" ? "📹 Verpasster Videoanruf" : "📞 Verpasster Anruf",
        message_type: "system",
      })
      .select("id, conversation_id, sender_id, message_type, content")
      .single();

    console.log("[CallContext] Missed call message insert result:", { callId: call.id, data, error });
  }, [user]);

  const insertCallSystemMessage = useCallback(async (call: CallRecord, content: string) => {
    if (!user) return;

    console.log("[CallContext] Call system message insert attempt:", {
      callId: call.id,
      conversationId: call.conversation_id,
      senderId: user.id,
      messageType: "system",
      content,
    });

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: call.conversation_id,
        sender_id: user.id,
        content,
        message_type: "system",
      })
      .select("id, conversation_id, sender_id, message_type, content")
      .single();

    console.log("[CallContext] Call system message insert result:", { callId: call.id, data, error });
  }, [user]);

  const markCallAsMissed = useCallback(async (call: CallRecord, source: string) => {
    const missedAt = new Date().toISOString();
    console.log("[CallContext] update to missed attempted", { callId: call.id, source, missedAt });

    const { data, error } = await supabase
      .from("calls" as any)
      .update({ status: "missed", missed_at: missedAt })
      .eq("id", call.id)
      .eq("status", "calling")
      .select("*")
      .maybeSingle();

    console.log("[CallContext] update to missed result", { callId: call.id, data, error });

    if (error || !data) return false;

    const updatedCall = data as unknown as CallRecord;
    setActiveCall((prev) => (prev?.id === updatedCall.id ? updatedCall : prev));
    await insertMissedCallMessage(updatedCall);
    return true;
  }, [insertMissedCallMessage]);

  const reconcileCalls = useCallback(async (reason: string) => {
    if (!user) return;

    const thresholdIso = new Date(Date.now() - CALL_TIMEOUT_MS).toISOString();
    console.log("[CallContext] Reconciling calls", { reason, userId: user.id, thresholdIso });

    const { data: pendingIncoming, error: pendingIncomingError } = await supabase
      .from("calls" as any)
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "calling")
      .gte("created_at", thresholdIso)
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("[CallContext] Pending incoming query:", { reason, pendingIncoming, pendingIncomingError });

    if (pendingIncoming?.length) {
      await showIncomingCall(pendingIncoming[0] as unknown as CallRecord, `reconcile:${reason}`);
    }

    const { data: staleOutgoing, error: staleOutgoingError } = await supabase
      .from("calls" as any)
      .select("*")
      .eq("caller_id", user.id)
      .eq("status", "calling")
      .lt("created_at", thresholdIso);

    console.log("[CallContext] Stale outgoing query:", { reason, staleOutgoing, staleOutgoingError });

    for (const staleCall of (staleOutgoing || []) as unknown as CallRecord[]) {
      await markCallAsMissed(staleCall, `reconcile:${reason}`);
    }
  }, [user, showIncomingCall, markCallAsMissed]);

  useEffect(() => {
    console.log("[CallContext] mounted", { userId: user?.id ?? null });
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    console.log("[CallContext] subscription created", { userId: user.id });

    const channel = supabase
      .channel(`global-calls-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          console.log("[CallContext] INSERT payload received", payload);
          await showIncomingCall(payload.new as CallRecord, "realtime-insert");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        (payload) => {
          console.log("[CallContext] UPDATE payload received", payload);
          const updated = payload.new as CallRecord;
          if (updated.caller_id !== user.id && updated.receiver_id !== user.id) return;

          setIncomingCall((prev) => {
            if (prev?.id !== updated.id) return prev;
            if (["accepted", "declined", "missed", "ended", "failed"].includes(updated.status)) {
              stopRinging();
              clearCallTimeout();
              handledIncomingIdsRef.current.delete(updated.id);
              console.log("[CallContext] overlay visible no", { currentIncomingCall: updated.id, status: updated.status });
              return null;
            }
            return prev;
          });

          setActiveCall((prev) => {
            if (prev?.id === updated.id) return updated;
            if (updated.status === "accepted" && updated.caller_id === user.id) return updated;
            return prev;
          });

          if (updated.caller_id === user.id && ["declined", "missed", "ended", "failed"].includes(updated.status)) {
            stopRinging();
            clearCallTimeout();
          }
        }
      )
      .subscribe((status) => {
        console.log("[CallContext] subscription status", status);
        if (status === "SUBSCRIBED") void reconcileCalls("subscribed");
      });

    void reconcileCalls("effect-start");
    const intervalId = window.setInterval(() => void reconcileCalls("interval"), RECONCILE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
      stopRinging();
      clearCallTimeout();
    };
  }, [user, clearCallTimeout, stopRinging, reconcileCalls, showIncomingCall]);

  const startCallFn = useCallback(async (conversationId: string, receiverId: string, isVideo: boolean): Promise<string | null> => {
    if (!user) {
      console.error("[CallContext] startCall aborted: no user session");
      return null;
    }

    const callType = isVideo ? "video" : "audio";
    console.log("[CallContext] startCall invoked", { callerId: user.id, receiverId, conversationId, callType });

    if (!conversationId || !receiverId || !user.id) {
      console.error("[CallContext] startCall invalid payload", { callerId: user.id, receiverId, conversationId, callType });
      return null;
    }

    const { data, error } = await supabase
      .from("calls" as any)
      .insert({
        caller_id: user.id,
        receiver_id: receiverId,
        conversation_id: conversationId,
        status: "calling",
        call_type: callType,
      })
      .select("*")
      .single();

    console.log("[CallContext] calls insert response", { data, error });

    if (error || !data) {
      console.error("[CallContext] Failed to create call record:", error);
      return null;
    }

    const call = data as unknown as CallRecord;
    setActiveCall(call);

    console.log("[CallContext] timeout started", { callId: call.id, timeoutMs: CALL_TIMEOUT_MS });
    clearCallTimeout();
    timeoutRef.current = setTimeout(async () => {
      console.log("[CallContext] timeout fired", { callId: call.id });

      const { data: current, error: currentError } = await supabase
        .from("calls" as any)
        .select("*")
        .eq("id", call.id)
        .maybeSingle();

      console.log("[CallContext] current call before timeout update", { callId: call.id, current, currentError });

      if (!current || (current as unknown as CallRecord).status !== "calling") return;
      await markCallAsMissed(current as unknown as CallRecord, "timeout");
    }, CALL_TIMEOUT_MS);

    const { data: notifyData, error: notifyError } = await supabase.functions.invoke("notify-incoming-call", {
      body: { conversationId, isVideo },
    });

    console.log("[CallContext] notify-incoming-call response", { notifyData, notifyError });

    return call.id;
  }, [user, clearCallTimeout, markCallAsMissed]);

  const acceptCallFn = useCallback(async () => {
    if (!incomingCall || !user) return;

    console.log("[CallContext] acceptCall invoked", { callId: incomingCall.id, userId: user.id });
    stopRinging();
    clearCallTimeout();

    const answeredAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("calls" as any)
      .update({ status: "accepted", answered_at: answeredAt })
      .eq("id", incomingCall.id)
      .select("*")
      .single();

    console.log("[CallContext] acceptCall response", { data, error });
    if (error || !data) return;

    setActiveCall(data as unknown as CallRecord);
    setIncomingCall(null);
    handledIncomingIdsRef.current.delete(incomingCall.id);
  }, [incomingCall, user, stopRinging, clearCallTimeout]);

  const declineCallFn = useCallback(async () => {
    if (!incomingCall || !user) return;

    console.log("[CallContext] declineCall invoked", { callId: incomingCall.id, userId: user.id });
    stopRinging();
    clearCallTimeout();

    const declinedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("calls" as any)
      .update({ status: "declined", declined_at: declinedAt })
      .eq("id", incomingCall.id)
      .select("*")
      .single();

    console.log("[CallContext] declineCall response", { data, error });

    if (data && !error) {
      await insertCallSystemMessage(data as unknown as CallRecord, data.call_type === "video" ? "📹 Videoanruf abgelehnt" : "📞 Anruf abgelehnt");
    }

    setIncomingCall(null);
    handledIncomingIdsRef.current.delete(incomingCall.id);
  }, [incomingCall, user, stopRinging, clearCallTimeout, insertCallSystemMessage]);

  const endCallFn = useCallback(async () => {
    if (!user || !activeCall) return;

    console.log("[CallContext] endCall invoked", { callId: activeCall.id, status: activeCall.status, userId: user.id });
    stopRinging();
    clearCallTimeout();

    if (["ended", "failed", "missed", "declined"].includes(activeCall.status)) {
      setActiveCall(null);
      return;
    }

    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("calls" as any)
      .update({ status: "ended", ended_at: endedAt })
      .eq("id", activeCall.id)
      .select("*")
      .single();

    console.log("[CallContext] endCall response", { data, error });

    if (data && !error) {
      await insertCallSystemMessage(data as unknown as CallRecord, data.call_type === "video" ? "📹 Videoanruf beendet" : "📞 Anruf beendet");
    }

    setActiveCall(null);
  }, [activeCall, user, stopRinging, clearCallTimeout, insertCallSystemMessage]);

  return (
    <CallContext.Provider value={{ incomingCall, activeCall, startCall: startCallFn, acceptCall: acceptCallFn, declineCall: declineCallFn, endCall: endCallFn }}>
      {children}
    </CallContext.Provider>
  );
};
