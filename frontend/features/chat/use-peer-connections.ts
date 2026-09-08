"use client";

import { useState, useRef, useCallback } from "react";
import type { SignalHandlerDeps } from "./webrtc-helpers";
import { updatedStreamMap } from "./webrtc-helpers";

type SendSignal = SignalHandlerDeps["sendSignal"];

interface UsePeerConnectionsParams {
  huddleId: number | null;
  currentUserId: string;
  localStreamRef: React.RefObject<MediaStream | null>;
  screenStreamRef: React.RefObject<MediaStream | null>;
  sendSignalRef: React.RefObject<SendSignal>;
  peerConnectionsRef: React.RefObject<Map<string, RTCPeerConnection>>;
  iceServersRef: React.RefObject<RTCIceServer[]>;
}

export function usePeerConnections({
  huddleId,
  currentUserId,
  localStreamRef,
  screenStreamRef,
  sendSignalRef,
  peerConnectionsRef,
  iceServersRef,
}: UsePeerConnectionsParams) {
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const streamsByUser = useRef<Map<string, Map<string, MediaStream>>>(new Map());

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
      const pc = peerConnectionsRef.current.get(targetUserId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(targetUserId);
      }
      pendingCandidates.current.delete(targetUserId);
      makingOffer.current.delete(targetUserId);
      streamsByUser.current.delete(targetUserId);
      classifyStreams(targetUserId);
    },
    [peerConnectionsRef, classifyStreams],
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
        iceServers: iceServersRef.current,
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

      peerConnectionsRef.current.set(targetUserId, pc);
      return pc;
    },
    [huddleId, currentUserId, localStreamRef, screenStreamRef, sendSignalRef, peerConnectionsRef, iceServersRef, classifyStreams],
  );

  const cleanupPeerConnections = useCallback(() => {
    for (const userId of Array.from(peerConnectionsRef.current.keys())) {
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) pc.close();
    }
    peerConnectionsRef.current.clear();
    pendingCandidates.current.clear();
    makingOffer.current.clear();
    streamsByUser.current.clear();
    setRemoteStreams(new Map());
    setRemoteScreenStreams(new Map());
  }, [peerConnectionsRef]);

  return {
    remoteStreams,
    remoteScreenStreams,
    pendingCandidates,
    makingOffer,
    createPeerConnection,
    closePeerConnection,
    flushPendingCandidates,
    cleanupPeerConnections,
  };
}
