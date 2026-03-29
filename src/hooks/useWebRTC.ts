import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ───────── Types ───────── */

export type CallState =
  | "idle"
  | "calling"    // outgoing, waiting for answer
  | "ringing"    // incoming, waiting for user decision
  | "connecting" // SDP exchanged, waiting for ICE
  | "connected"
  | "reconnecting"
  | "ended"
  | "error";

export interface CallError {
  code: "permission_denied" | "no_device" | "network" | "timeout" | "unknown";
  message: string;
}

interface UseWebRTCOptions {
  conversationId: string;
  userId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallError?: (error: CallError) => void;
}

/* ───────── ICE Servers (STUN + public TURN) ───────── */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free public TURN servers (metered.ca open relay)
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "e8dd65b92fdd354742c3b807",
    credential: "3jq+CSwVBOkTz06a",
  },
  {
    urls: "turn:a.relay.metered.ca:80?transport=tcp",
    username: "e8dd65b92fdd354742c3b807",
    credential: "3jq+CSwVBOkTz06a",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "e8dd65b92fdd354742c3b807",
    credential: "3jq+CSwVBOkTz06a",
  },
  {
    urls: "turns:a.relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92fdd354742c3b807",
    credential: "3jq+CSwVBOkTz06a",
  },
];

const CALL_TIMEOUT_MS = 45_000; // 45s without answer → end
const RECONNECT_TIMEOUT_MS = 15_000; // 15s to reconnect

/* ───────── Hook ───────── */

export function useWebRTC({
  conversationId,
  userId,
  onRemoteStream,
  onCallError,
}: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const isAnsweringRef = useRef(false);
  const cleanedUpRef = useRef(false);

  /* ── Helpers ── */

  const clearTimers = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const reportError = useCallback(
    (code: CallError["code"], message: string) => {
      console.error(`[WebRTC] Error (${code}):`, message);
      setCallState("error");
      onCallError?.({ code, message });
    },
    [onCallError]
  );

  /* ── Media ── */

  const getLocalStream = useCallback(
    async (video: boolean): Promise<MediaStream> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: video
            ? {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                facingMode: "user",
              }
            : false,
        });
        localStreamRef.current = stream;
        return stream;
      } catch (err: any) {
        // Try audio-only fallback
        if (video) {
          console.warn("[WebRTC] Video failed, trying audio only:", err.message);
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            localStreamRef.current = audioStream;
            setIsVideoEnabled(false);
            return audioStream;
          } catch (audioErr: any) {
            handleMediaError(audioErr);
            throw audioErr;
          }
        }
        handleMediaError(err);
        throw err;
      }
    },
    [reportError]
  );

  const handleMediaError = useCallback(
    (err: any) => {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        reportError("permission_denied", "Kamera-/Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Einstellungen.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        reportError("no_device", "Kein Mikrofon oder Kamera gefunden.");
      } else {
        reportError("unknown", `Medienzugriff fehlgeschlagen: ${err.message}`);
      }
    },
    [reportError]
  );

  /* ── PeerConnection ── */

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 2,
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), from: userId },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) {
        console.log("[WebRTC] Remote track received");
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[WebRTC] Connection state:", state);

      switch (state) {
        case "connected":
          setIsConnected(true);
          setCallState("connected");
          clearTimers();
          break;

        case "disconnected":
          // Try to reconnect
          setCallState("reconnecting");
          reconnectTimeoutRef.current = setTimeout(() => {
            console.warn("[WebRTC] Reconnect timeout – ending call");
            endCallInternal();
          }, RECONNECT_TIMEOUT_MS);
          break;

        case "failed":
          reportError("network", "Verbindung fehlgeschlagen. Überprüfe deine Internetverbindung.");
          endCallInternal();
          break;

        case "closed":
          setIsConnected(false);
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        // Clear reconnect timer if ICE reconnects
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        setCallState("connected");
        setIsConnected(true);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [userId, onRemoteStream, clearTimers, reportError]);

  /* ── Flush queued ICE candidates ── */

  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] Failed to add queued ICE candidate:", e);
      }
    }
  }, []);

  /* ── End call (internal, no broadcast) ── */

  const endCallInternal = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    clearTimers();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    iceCandidateQueue.current = [];
    pendingOfferRef.current = null;
    isAnsweringRef.current = false;

    setIsConnected(false);
    setCallState("ended");
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  }, [clearTimers]);

  /* ── Signaling ── */

  const setupSignaling = useCallback(
    (mode: "caller" | "callee") => {
      // Remove existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(`call-${conversationId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === userId) return;
          console.log("[WebRTC] Received offer");

          if (mode === "callee" && pcRef.current) {
            // Set remote description and create answer
            try {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(payload.sdp)
              );
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);

              channel.send({
                type: "broadcast",
                event: "answer",
                payload: { sdp: answer, from: userId },
              });
              setCallState("connecting");
              await flushIceCandidates();
            } catch (e) {
              console.error("[WebRTC] Error handling offer:", e);
            }
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === userId || !pcRef.current) return;
          console.log("[WebRTC] Received answer");

          try {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
            setCallState("connecting");
            await flushIceCandidates();
          } catch (e) {
            console.error("[WebRTC] Error setting remote description:", e);
          }
        })
        .on("broadcast", { event: "ready" }, async ({ payload }) => {
          // Callee joined the channel and is ready – re-send the offer
          if (payload.from === userId || mode !== "caller") return;
          console.log("[WebRTC] Callee ready – re-sending offer");

          if (pcRef.current?.localDescription) {
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { sdp: pcRef.current.localDescription, from: userId },
            });
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.from === userId) return;

          if (!pcRef.current?.remoteDescription) {
            iceCandidateQueue.current.push(payload.candidate);
            return;
          }

          try {
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          } catch (e) {
            console.warn("[WebRTC] ICE candidate error:", e);
          }
        })
        .on("broadcast", { event: "hang-up" }, ({ payload }) => {
          if (payload.from === userId) return;
          console.log("[WebRTC] Remote hang-up");
          endCallInternal();
        })
        .subscribe();

      channelRef.current = channel;
      return channel;
    },
    [conversationId, userId, flushIceCandidates, endCallInternal]
  );

  /* ── Public: Start call (outgoing) ── */

  const startCall = useCallback(
    async (video: boolean): Promise<MediaStream | null> => {
      cleanedUpRef.current = false;
      setCallState("calling");
      setIsVideoEnabled(video);

      try {
        const stream = await getLocalStream(video);
        const channel = setupSignaling("caller");
        const pc = createPeerConnection();

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Small delay to ensure channel is subscribed before sending
        await new Promise((r) => setTimeout(r, 500));

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { sdp: offer, from: userId },
        });

        // Call timeout
        callTimeoutRef.current = setTimeout(() => {
          if (callState === "calling") {
            console.warn("[WebRTC] Call timeout – no answer");
            reportError("timeout", "Keine Antwort. Versuche es später erneut.");
            endCall();
          }
        }, CALL_TIMEOUT_MS);

        return stream;
      } catch (err) {
        // Media errors are already handled in getLocalStream
        return null;
      }
    },
    [setupSignaling, createPeerConnection, getLocalStream, userId, reportError, clearTimers]
  );

  /* ── Public: Answer call (incoming) ── */

  const answerCall = useCallback(
    async (video: boolean): Promise<MediaStream | null> => {
      cleanedUpRef.current = false;
      isAnsweringRef.current = true;
      setCallState("connecting");
      setIsVideoEnabled(video);

      try {
        const stream = await getLocalStream(video);
        const channel = setupSignaling("callee");
        const pc = createPeerConnection();

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Wait briefly so the channel is fully subscribed before asking the
        // caller to re-send the offer. This is important when the app is opened
        // from an incoming push notification on iPhone/Android.
        await new Promise((resolve) => setTimeout(resolve, 500));

        const readyPayload = {
          type: "broadcast" as const,
          event: "ready",
          payload: { from: userId },
        };

        channel.send(readyPayload);

        // Retry once in case the first ready signal races the subscription.
        setTimeout(() => {
          if (!pcRef.current?.remoteDescription) {
            channel.send(readyPayload);
          }
        }, 1500);

        return stream;
      } catch (err) {
        return null;
      }
    },
    [setupSignaling, createPeerConnection, getLocalStream, userId]
  );

  /* ── Public: End call ── */

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "hang-up",
        payload: { from: userId },
      });
      // Give broadcast time to send
      setTimeout(() => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }, 300);
    }
    endCallInternal();
  }, [userId, endCallInternal]);

  /* ── Toggles ── */

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  }, []);

  /* ── Cleanup on unmount ── */

  useEffect(() => {
    return () => {
      clearTimers();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [clearTimers]);

  return {
    callState,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    localStream: localStreamRef.current,
    startCall,
    answerCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
