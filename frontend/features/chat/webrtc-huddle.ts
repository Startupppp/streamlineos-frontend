"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import type { InboundMessage } from "ably";
import { useSendHuddleSignal } from "@/lib/api/hooks/chat-huddles";
import type { HuddleParticipant } from "@/types/chat";

const STUN_SERVERS = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: STUN_SERVERS }],
};

interface SignalEventPayload {
  type: "offer" | "answer" | "ice-candidate";
  targetUserId: string;
  payload: {
    sdp?: string;
    fromUserId: string;
    candidate?: RTCIceCandidateInit;
  };
}

export function useWebRTCHuddle(
  huddleId: number | null,
  channelId: number,
  participants: HuddleParticipant[],
  currentUserId: string,
) {
  const ably = useAbly();
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const sendSignalMutation = useSendHuddleSignal();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const knownParticipants = useRef<Set<string>>(new Set());
  const streamReady = useRef(false);
  const sendSignalRef = useRef<typeof sendSignalMutation.mutate>(sendSignalMutation.mutate);

  useEffect(() => {
    sendSignalRef.current = sendSignalMutation.mutate;
  });

  const closePeerConnection = useCallback((targetUserId: string) => {
    const pc = peerConnections.current.get(targetUserId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetUserId);
    }
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(targetUserId);
      return next;
    });
  }, []);

  const createPeerConnection = useCallback(
    (targetUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, remoteStream);
            return next;
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !huddleId) return;
        sendSignalRef.current({
          huddleId,
          type: "ice-candidate",
          targetUserId,
          payload: { candidate: event.candidate.toJSON(), fromUserId: currentUserId },
        });
      };

      peerConnections.current.set(targetUserId, pc);
      return pc;
    },
    [huddleId, currentUserId],
  );

  useEffect(() => {
    if (!huddleId) return;

    let mounted = true;

    navigator.mediaDevices
      .getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        streamReady.current = true;
        setLocalStream(stream);
      })
      .catch(() => {});

    return () => {
      mounted = false;
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      localStreamRef.current = null;
      streamReady.current = false;
      setLocalStream(null);
    };
  }, [huddleId]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0 || !huddleId) return;

    const signalChannelName = `huddle-signal:${orgId}:${channelId}:${currentUserId}`;
    const ablyChannel = ably.channels.get(signalChannelName);

    const handleSignal = async (msg: InboundMessage) => {
      const signal = msg.data as SignalEventPayload;
      if (!signal) return;

      if (signal.type === "offer") {
        const fromUserId = signal.payload.fromUserId;
        let pc = peerConnections.current.get(fromUserId);
        if (!pc) {
          pc = createPeerConnection(fromUserId);
        }
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: signal.payload.sdp ?? "" }),
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalRef.current({
          huddleId,
          type: "answer",
          targetUserId: fromUserId,
          payload: { sdp: answer.sdp, fromUserId: currentUserId },
        });
      } else if (signal.type === "answer") {
        const fromUserId = signal.payload.fromUserId;
        const pc = peerConnections.current.get(fromUserId);
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: signal.payload.sdp ?? "" }),
          );
        }
      } else if (signal.type === "ice-candidate") {
        const fromUserId = signal.payload.fromUserId;
        const pc = peerConnections.current.get(fromUserId);
        if (pc && signal.payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload.candidate));
        }
      }
    };

    ablyChannel.subscribe("signal", handleSignal);

    return () => {
      ablyChannel.unsubscribe("signal", handleSignal);
    };
  }, [ably, channelId, orgId, huddleId, currentUserId, createPeerConnection]);

  useEffect(() => {
    if (!huddleId || !streamReady.current) return;

    const activeUserIds = new Set(
      participants
        .filter((p) => p.userId !== currentUserId && !p.leftAt)
        .map((p) => p.userId),
    );

    for (const userId of knownParticipants.current) {
      if (!activeUserIds.has(userId)) {
        closePeerConnection(userId);
        knownParticipants.current.delete(userId);
      }
    }

    for (const userId of activeUserIds) {
      if (!knownParticipants.current.has(userId)) {
        knownParticipants.current.add(userId);

        if (currentUserId < userId) {
          const pc = createPeerConnection(userId);
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer).then(() => offer))
            .then((offer) => {
              sendSignalRef.current({
                huddleId,
                type: "offer",
                targetUserId: userId,
                payload: { sdp: offer.sdp, fromUserId: currentUserId },
              });
            })
            .catch(() => {});
        }
      }
    }
  }, [participants, huddleId, currentUserId, createPeerConnection, closePeerConnection]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const cleanup = useCallback(() => {
    for (const userId of Array.from(peerConnections.current.keys())) {
      closePeerConnection(userId);
    }
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    localStreamRef.current = null;
    streamReady.current = false;
    knownParticipants.current.clear();
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsMuted(false);
  }, [closePeerConnection]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { localStream, remoteStreams, isMuted, toggleMute, cleanup };
}
