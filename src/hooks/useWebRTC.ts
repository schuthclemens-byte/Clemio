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

/* ───────── ICE Servers – fetched from edge function ───────── */

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const { data, error } = await supabase.functions.invoke("turn-credentials");
    if (error || !data?.iceServers) {
      console.warn("Failed to fetch TURN credentials, using STUN only:", error);
      return FALLBACK_ICE_SERVERS;
    }
    return data.iceServers as RTCIceServer[];
  } catch (e) {
    console.warn("Failed to fetch TURN credentials, using STUN only:", e);
    return FALLBACK_ICE_SERVERS;
  }
}

const CALL_TIMEOUT_MS = 45_000;
const RECONNECT_TIMEOUT_MS = 15_000;

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
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const isAnsweringRef = useRef(false);
  const cleanedUpRef = useRef(false);
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);

  // Keep callbacks in refs to avoid stale closures
  const onRemoteStreamRef = useRef(onRemoteStream);
  onRemoteStreamRef.current = onRemoteStream;
  const onCallErrorRef = useRef(onCallError);
  onCallErrorRef.current = onCallError;

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
      onCallErrorRef.current?.({ code, message });
    },
    []
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

        console.log("[WebRTC] getUserMedia success:", {
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          audioEnabled: stream.getAudioTracks()[0]?.enabled,
          audioState: stream.getAudioTracks()[0]?.readyState,
          videoEnabled: stream.getVideoTracks()[0]?.enabled,
          videoState: stream.getVideoTracks()[0]?.readyState,
        });

        localStreamRef.current = stream;
        return stream;
      } catch (err: any) {
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

    // Use a single persistent MediaStream for remote tracks
    const persistentRemoteStream = new MediaStream();

    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack fired:", {
        kind: event.track.kind,
        trackId: event.track.id,
        trackEnabled: event.track.enabled,
        trackState: event.track.readyState,
        streamCount: event.streams.length,
        streamId: event.streams[0]?.id,
        audioTracksInStream: event.streams[0]?.getAudioTracks().length,
        videoTracksInStream: event.streams[0]?.getVideoTracks().length,
      });

      // Add each track to our persistent stream
      persistentRemoteStream.addTrack(event.track);

      console.log("[WebRTC] persistentRemoteStream now has:", {
        audio: persistentRemoteStream.getAudioTracks().length,
        video: persistentRemoteStream.getVideoTracks().length,
      });

      // Update state — always set the same stream object reference
      setRemoteStream(persistentRemoteStream);
      onRemoteStreamRef.current?.(persistentRemoteStream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[WebRTC] connectionState:", state);

      switch (state) {
        case "connected":
          setIsConnected(true);
          setCallState("connected");
          clearTimers();
          break;
        case "disconnected":
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
      console.log("[WebRTC] iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
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
  }, [userId, clearTimers, reportError]);

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
    setRemoteStream(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  }, [clearTimers]);

  /* ── Signaling ── */

  const setupSignaling = useCallback(
    (mode: "caller" | "callee") => {
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

        callTimeoutRef.current = setTimeout(() => {
          const pc = pcRef.current;
          const isStillWaiting = pc && pc.connectionState !== "connected";
          if (isStillWaiting) {
            console.warn("[WebRTC] Call timeout – no answer");
            reportError("timeout", "Keine Antwort. Versuche es später erneut.");
            endCall();
          }
        }, CALL_TIMEOUT_MS);

        return stream;
      } catch (err) {
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

        await new Promise((resolve) => setTimeout(resolve, 500));

        const readyPayload = {
          type: "broadcast" as const,
          event: "ready",
          payload: { from: userId },
        };

        channel.send(readyPayload);

        // Retry once in case the first ready signal races the subscription
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

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    if (!stream) return;

    const currentTrack = stream.getVideoTracks()[0];

    if (currentTrack && currentTrack.readyState === "live" && currentTrack.enabled) {
      // Disable: stop the track and remove from stream
      currentTrack.enabled = false;
      currentTrack.stop();
      stream.removeTrack(currentTrack);
      setIsVideoEnabled(false);
      console.log("[WebRTC] Video disabled — track stopped");
    } else {
      // Enable: get a new video track
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: "user",
          },
        });
        const newTrack = newVideoStream.getVideoTracks()[0];

        // Add to local stream
        stream.addTrack(newTrack);

        // Replace in peer connection sender
        if (pc) {
          const videoSender = pc.getSenders().find(s => s.track?.kind === "video" || (!s.track && s.replaceTrack));
          if (videoSender) {
            await videoSender.replaceTrack(newTrack);
            console.log("[WebRTC] Video re-enabled via replaceTrack");
          } else {
            pc.addTrack(newTrack, stream);
            console.log("[WebRTC] Video re-enabled via addTrack");
          }
        }

        // Update the ref so localVideoRef gets correct srcObject
        localStreamRef.current = stream;
        setIsVideoEnabled(true);
        console.log("[WebRTC] Video enabled — new track acquired");
      } catch (err) {
        console.warn("[WebRTC] Failed to re-enable video:", err);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
      console.log("[WebRTC] Audio toggled:", track.enabled);
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
    remoteStream,
    startCall,
    answerCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
