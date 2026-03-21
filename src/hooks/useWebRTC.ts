import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  conversationId: string;
  userId: string;
  onRemoteStream?: (stream: MediaStream) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export function useWebRTC({ conversationId, userId, onRemoteStream }: UseWebRTCOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callState, setCallState] = useState<"idle" | "calling" | "ringing" | "connected" | "ended">("idle");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

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
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setCallState("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsConnected(false);
        setCallState("ended");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [userId, onRemoteStream]);

  const getLocalStream = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      // Fallback: audio only
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
      setIsVideoEnabled(false);
      return stream;
    }
  }, []);

  const setupSignaling = useCallback(() => {
    const channel = supabase.channel(`call-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === userId) return;
        setCallState("ringing");

        // Auto-answer for now (can add ringing UI later)
        const pc = createPeerConnection();
        const stream = await getLocalStream(true);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { sdp: answer, from: userId },
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === userId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === userId || !pcRef.current) return;
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("ICE candidate error:", e);
        }
      })
      .on("broadcast", { event: "hang-up" }, ({ payload }) => {
        if (payload.from === userId) return;
        endCall();
      })
      .subscribe();

    channelRef.current = channel;
    return channel;
  }, [conversationId, userId, createPeerConnection, getLocalStream]);

  const startCall = useCallback(async (video: boolean) => {
    setCallState("calling");
    setIsVideoEnabled(video);

    const channel = setupSignaling();
    const pc = createPeerConnection();
    const stream = await getLocalStream(video);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    channel.send({
      type: "broadcast",
      event: "offer",
      payload: { sdp: offer, from: userId },
    });

    return stream;
  }, [setupSignaling, createPeerConnection, getLocalStream, userId]);

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "hang-up",
        payload: { from: userId },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    setIsConnected(false);
    setCallState("ended");
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
  }, [userId]);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (callState === "idle") {
      const channel = setupSignaling();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return {
    callState,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    localStream: localStreamRef.current,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
