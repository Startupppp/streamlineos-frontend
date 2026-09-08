"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import type { InboundMessage } from "ably";
import { useSendHuddleSignal } from "@/hooks/api/chat-huddles";
import type { HuddleParticipant } from "@/types/chat";
import { getErrorMessage } from "@/lib/get-error-message";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { huddleSignalChannelName } from "@/lib/ably-channels";
import { useAblyConnection } from "./use-ably-connection";
import {
  FALLBACK_ICE_SERVERS,
  fetchIceServers,
  handleIncomingSignal,
  type IncomingSignalData,
} from "./webrtc-helpers";
import { useMicManager } from "./use-mic-manager";
import { useScreenShare } from "./use-screen-share";
import { usePeerConnections } from "./use-peer-connections";

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

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const sendSignalRef = useRef(sendSignalMutation.mutate);
  const knownParticipants = useRef<Set<string>>(new Set());
  const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  useEffect(() => {
    sendSignalRef.current = sendSignalMutation.mutate;
  });

  useEffect(() => {
    let cancelled = false;
    fetchIceServers()
      .then((servers) => {
        if (!cancelled) iceServersRef.current = servers;
      })
      .catch(() => {
        if (!cancelled) iceServersRef.current = FALLBACK_ICE_SERVERS;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    localStream,
    localStreamRef,
    isMicReady,
    isMuted,
    micError,
    toggleMute,
    switchAudioDevice,
    cleanupMic,
  } = useMicManager({
    huddleId,
    audioInputDeviceId: deviceIds?.audioInput,
    peerConnectionsRef,
  });

  const {
    screenStream,
    screenStreamRef,
    isSharingScreen,
    startScreenShare,
    stopScreenShare,
    pauseScreenShare,
    resumeScreenShare,
    cleanupScreenShare,
  } = useScreenShare({ peerConnectionsRef });

  const {
    remoteStreams,
    remoteScreenStreams,
    pendingCandidates,
    makingOffer,
    createPeerConnection,
    closePeerConnection,
    flushPendingCandidates,
    cleanupPeerConnections,
  } = usePeerConnections({
    huddleId,
    currentUserId,
    localStreamRef,
    screenStreamRef,
    sendSignalRef,
    peerConnectionsRef,
    iceServersRef,
  });

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0 || !huddleId) return;
    if (sessionStatus !== "authenticated" || !isAblyConnected) return;

    const signalChannelName = huddleSignalChannelName(orgId, channelId, currentUserId);
    const ablyChannel = ably.channels.get(signalChannelName);

    const handleSignal = async (msg: InboundMessage) => {
      const signal = msg.data as IncomingSignalData;
      if (!signal?.fromUserId) return;

      try {
        await handleIncomingSignal(signal, {
          huddleId,
          currentUserId,
          peerConnections: peerConnectionsRef.current,
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
    pendingCandidates,
    makingOffer,
  ]);

  useEffect(() => {
    if (!huddleId || !isMicReady) return;

    const activeUserIds = new Set(
      participants
        .filter(
          (p): p is HuddleParticipant & { userId: string } =>
            p.userId !== null && p.userId !== currentUserId && !p.leftAt,
        )
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

  const getPeerConnection = useCallback((userId: string): RTCPeerConnection | undefined => {
    return peerConnectionsRef.current.get(userId);
  }, []);

  const cleanup = useCallback(() => {
    cleanupPeerConnections();
    cleanupMic();
    cleanupScreenShare();
    knownParticipants.current.clear();
    setRealtimeError(null);
  }, [cleanupPeerConnections, cleanupMic, cleanupScreenShare]);

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
