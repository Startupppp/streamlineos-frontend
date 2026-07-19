"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import type { InboundMessage } from "ably";
import { useSendHuddleSignal } from "@/hooks/api/chat-huddles";
import type { HuddleParticipant } from "@/types/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { useAblyConnection } from "./use-ably-connection";
import {
  getIceServers,
  handleIncomingSignal,
  updatedStreamMap,
  type IncomingSignalData,
} from "./webrtc-helpers";

export function useWebRTCHuddle(
  huddleId: number | null,
  channelId: number,
  participants: HuddleParticipant[],
  currentUserId: string,
  deviceIds?: { audioInput?: string; videoInput?: string; audioOutput?: string },
) {
  const ably = useAbly();
  const { data: session, status: sessionStatus } = useSession();
  const orgId = session?.orgId;
  const { isConnected: isAblyConnected, connectionError: ablyConnectionError } = useAblyConnection();
  const sendSignalMutation = useSendHuddleSignal();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMicReady, setIsMicReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const streamsByUser = useRef<Map<string, Map<string, MediaStream>>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const knownParticipants = useRef<Set<string>>(new Set());
  const sendSignalRef = useRef<typeof sendSignalMutation.mutate>(sendSignalMutation.mutate);

  useEffect(() => {
    sendSignalRef.current = sendSignalMutation.mutate;
  });

  const classifyStreams = useCallback((userId: string) => {
    const streams = streamsByUser.current.get(userId);
    let mic: MediaStream | null = null;
    let screen: MediaStream | null = null;
    if (streams) {
      for (const stream of streams.values()) {
        const liveVideo = stream
          .getVideoTracks()
          .some((t) => t.readyState === "live" && !t.muted);
        const liveAudio = stream.getAudioTracks().some((t) => t.readyState === "live");
        if (liveVideo && !screen) screen = stream;
        else if (!liveVideo && liveAudio && !mic) mic = stream;
      }
    }
    setRemoteStreams((prev) => updatedStreamMap(prev, userId, mic));
    setRemoteScreenStreams((prev) => updatedStreamMap(prev, userId, screen));
  }, []);

  const closePeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = peerConnections.current.get(targetUserId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(targetUserId);
      }
      pendingCandidates.current.delete(targetUserId);
      makingOffer.current.delete(targetUserId);
      streamsByUser.current.delete(targetUserId);
      classifyStreams(targetUserId);
    },
    [classifyStreams],
  );

  const flushPendingCandidates = useCallback(async (targetUserId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidates.current.get(targetUserId);
    if (!queued || queued.length === 0) return;
    pendingCandidates.current.delete(targetUserId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  }, []);

  const createPeerConnection = useCallback(
    (targetUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({
        iceServers: getIceServers(),
        iceTransportPolicy: "all",
      });

      const micStream = localStreamRef.current;
      if (micStream) {
        micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));
      }
      const activeScreen = screenStreamRef.current;
      if (activeScreen) {
        activeScreen.getTracks().forEach((track) => pc.addTrack(track, activeScreen));
      }

      pc.onnegotiationneeded = async () => {
        if (!huddleId) return;
        try {
          makingOffer.current.add(targetUserId);
          await pc.setLocalDescription();
          const sdp = pc.localDescription?.sdp;
          if (sdp) {
            sendSignalRef.current({
              huddleId,
              type: "offer",
              targetUserId,
              payload: { sdp, fromUserId: currentUserId },
            });
          }
        } catch {
        } finally {
          makingOffer.current.delete(targetUserId);
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        let byId = streamsByUser.current.get(targetUserId);
        if (!byId) {
          byId = new Map();
          streamsByUser.current.set(targetUserId, byId);
        }
        if (!byId.has(stream.id)) {
          byId.set(stream.id, stream);
          const reclassify = () => classifyStreams(targetUserId);
          stream.addEventListener("addtrack", reclassify);
          stream.addEventListener("removetrack", reclassify);
        }
        const reclassifyTrack = () => classifyStreams(targetUserId);
        event.track.addEventListener("ended", reclassifyTrack);
        event.track.addEventListener("mute", reclassifyTrack);
        event.track.addEventListener("unmute", reclassifyTrack);
        classifyStreams(targetUserId);
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
          setTimeout(() => {
            const stillBroken =
              pc.connectionState === "failed" || pc.connectionState === "disconnected";
            if (stillBroken && currentUserId < targetUserId) {
              pc.restartIce();
            }
          }, 2000);
        }
      };

      peerConnections.current.set(targetUserId, pc);
      return pc;
    },
    [huddleId, currentUserId, classifyStreams],
  );

  useEffect(() => {
    if (!huddleId) return;

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
        setLocalStream(stream);
        setMicError(null);
        peerConnections.current.forEach((pc) => {
          const hasAudioSender = pc.getSenders().some((s) => s.track?.kind === "audio");
          if (!hasAudioSender) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }
        });
        setIsMicReady(true);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setMicError(getErrorMessage(err));
        }
      });

    return () => {
      mounted = false;
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      localStreamRef.current = null;
      setLocalStream(null);
      setIsMicReady(false);
    };
  }, [huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0 || !huddleId) return;
    if (sessionStatus !== "authenticated" || !isAblyConnected) return;

    const signalChannelName = `huddle-signal:${orgId}:${channelId}:${currentUserId}`;
    const ablyChannel = ably.channels.get(signalChannelName);

    const handleSignal = async (msg: InboundMessage) => {
      const signal = msg.data as IncomingSignalData;
      if (!signal?.fromUserId) return;

      try {
        await handleIncomingSignal(signal, {
          huddleId,
          currentUserId,
          peerConnections: peerConnections.current,
          pendingCandidates: pendingCandidates.current,
          makingOffer: makingOffer.current,
          createPeerConnection,
          flushPendingCandidates,
          sendSignal: sendSignalRef.current,
        });
      } catch {}
    };

    let cancelled = false;
    let didSubscribe = false;

    async function setup() {
      try {
        if (ably.connection.state !== "connected") {
          await ably.connection.whenState("connected");
        }
        if (cancelled) return;
        const ok = await safeSubscribe(ablyChannel, "signal", handleSignal);
        if (cancelled) {
          if (ok) safeUnsubscribe(ablyChannel, "signal", handleSignal);
          return;
        }
        if (ok) {
          didSubscribe = true;
          setRealtimeError(null);
          return;
        }
        if (!cancelled) {
          setRealtimeError("Real-time connection unavailable");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setRealtimeError(getErrorMessage(err));
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      if (!didSubscribe) return;
      safeUnsubscribe(ablyChannel, "signal", handleSignal);
    };
  }, [
    ably,
    channelId,
    orgId,
    huddleId,
    currentUserId,
    createPeerConnection,
    flushPendingCandidates,
    isAblyConnected,
    sessionStatus,
  ]);

  useEffect(() => {
    if (!huddleId || !isMicReady) return;

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
          createPeerConnection(userId);
        }
      }
    }
  }, [participants, huddleId, currentUserId, isMicReady, createPeerConnection, closePeerConnection]);

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
    } catch {}
  }, []);

  const getPeerConnection = useCallback((userId: string): RTCPeerConnection | undefined => {
    return peerConnections.current.get(userId);
  }, []);

  const stopScreenShare = useCallback(() => {
    const stream = screenStreamRef.current;
    if (stream) {
      const screenTracks = new Set(stream.getTracks());
      peerConnections.current.forEach((pc) => {
        pc.getSenders()
          .filter((s) => s.track !== null && screenTracks.has(s.track))
          .forEach((s) => {
            pc.removeTrack(s);
          });
      });
      stream.getTracks().forEach((t) => t.stop());
    }
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
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const handleTrackEnded = () => {
          videoTrack.removeEventListener("ended", handleTrackEnded);
          stopScreenShare();
        };
        videoTrack.addEventListener("ended", handleTrackEnded);
      }
    } catch {}
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
    knownParticipants.current.clear();
    pendingCandidates.current.clear();
    makingOffer.current.clear();
    streamsByUser.current.clear();
    setLocalStream(null);
    setIsMicReady(false);
    setRemoteStreams(new Map());
    setRemoteScreenStreams(new Map());
    setIsMuted(false);
    setScreenStream(null);
    setIsSharingScreen(false);
    setMicError(null);
    setRealtimeError(null);
  }, [closePeerConnection]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    localStream,
    remoteStreams,
    remoteScreenStreams,
    screenStream,
    isMuted,
    isSharingScreen,
    micError,
    realtimeError: realtimeError ?? ablyConnectionError,
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
