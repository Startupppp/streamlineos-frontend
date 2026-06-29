"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import type { InboundMessage } from "ably";
import { useSendHuddleSignal } from "@/hooks/api/chat-huddles";
import type { HuddleParticipant } from "@/types/chat";

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  if (process.env.NEXT_PUBLIC_TURN_URL) {
    servers.push({
      urls: process.env.NEXT_PUBLIC_TURN_URL,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? "",
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "",
    });
  }
  return servers;
}

interface IncomingSignalData {
  fromUserId: string;
  type: "offer" | "answer" | "ice-candidate";
  payload: {
    sdp?: string;
    fromUserId?: string;
    candidate?: RTCIceCandidateInit;
  };
}

export function useWebRTCHuddle(
  huddleId: number | null,
  channelId: number,
  participants: HuddleParticipant[],
  currentUserId: string,
  deviceIds?: { audioInput?: string; videoInput?: string; audioOutput?: string },
) {
  const ably = useAbly();
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const sendSignalMutation = useSendHuddleSignal();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
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
      const pc = new RTCPeerConnection({
        iceServers: getIceServers(),
        iceTransportPolicy: "all",
      });

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

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setTimeout(async () => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              pc.restartIce();
              if (pc.signalingState === "stable" && huddleId) {
                try {
                  const offer = await pc.createOffer({ iceRestart: true });
                  await pc.setLocalDescription(offer);
                  sendSignalRef.current({
                    huddleId,
                    type: "offer",
                    targetUserId,
                    payload: { sdp: offer.sdp, fromUserId: currentUserId },
                  });
                } catch (_err) {}
              }
            }
          }, 2000);
        }
      };

      peerConnections.current.set(targetUserId, pc);
      return pc;
    },
    [huddleId, currentUserId],
  );

  useEffect(() => {
    if (!huddleId) return;

    const bc = new BroadcastChannel(`huddle-${huddleId}`);
    bc.postMessage("claim");
    let isActive = true;
    bc.onmessage = (e) => {
      if (e.data === "claim" && isActive) {
        bc.postMessage("yield");
      }
    };

    let mounted = true;

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (deviceIds?.audioInput) {
      audioConstraints.deviceId = { exact: deviceIds.audioInput };
    }

    navigator.mediaDevices
      .getUserMedia({ audio: audioConstraints })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        streamReady.current = true;
        setLocalStream(stream);
        setMicError(null);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setMicError(err instanceof Error ? err.message : "Microphone access denied");
        }
      });

    return () => {
      mounted = false;
      isActive = false;
      bc.close();
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      localStreamRef.current = null;
      streamReady.current = false;
      setLocalStream(null);
    };
  }, [huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0 || !huddleId) return;

    const signalChannelName = `huddle-signal:${orgId}:${channelId}:${currentUserId}`;
    const ablyChannel = ably.channels.get(signalChannelName);

    const handleSignal = async (msg: InboundMessage) => {
      const signal = msg.data as IncomingSignalData;
      if (!signal) return;

      if (signal.type === "offer") {
        const fromUserId = signal.fromUserId;
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
        const fromUserId = signal.fromUserId;
        const pc = peerConnections.current.get(fromUserId);
        if (pc && pc.signalingState !== "stable") {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: signal.payload.sdp ?? "" }),
          );
        }
      } else if (signal.type === "ice-candidate") {
        const fromUserId = signal.fromUserId;
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

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
      });
      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
        if (sender) sender.replaceTrack(newTrack).catch(() => {});
      });
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.stop();
        localStreamRef.current?.removeTrack(t);
      });
      localStreamRef.current?.addTrack(newTrack);
      setLocalStream((prev) => {
        const s = prev ?? new MediaStream();
        s.getAudioTracks().forEach((t) => s.removeTrack(t));
        s.addTrack(newTrack);
        return s;
      });
    } catch (_err) {}
  }, []);

  const getPeerConnection = useCallback((userId: string): RTCPeerConnection | undefined => {
    return peerConnections.current.get(userId);
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsSharingScreen(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
        },
      });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsSharingScreen(true);
      peerConnections.current.forEach((pc) => {
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopScreenShare());
    } catch (_err) {}
  }, [stopScreenShare]);

  const pauseScreenShare = useCallback(() => {
    const track = screenStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = false;
      setIsSharingScreen(false);
    }
  }, []);

  const resumeScreenShare = useCallback(() => {
    const track = screenStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = true;
      setIsSharingScreen(true);
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
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    localStreamRef.current = null;
    streamReady.current = false;
    knownParticipants.current.clear();
    setLocalStream(null);
    setRemoteStreams(new Map());
    setIsMuted(false);
    setScreenStream(null);
    setIsSharingScreen(false);
    setMicError(null);
  }, [closePeerConnection]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    localStream,
    remoteStreams,
    screenStream,
    isMuted,
    isSharingScreen,
    micError,
    toggleMute,
    switchAudioDevice,
    getPeerConnection,
    startScreenShare,
    stopScreenShare,
    pauseScreenShare,
    resumeScreenShare,
    cleanup,
  };
}
