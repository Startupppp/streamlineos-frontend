"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSendMeetingSignal } from "@/lib/api/hooks";
import type { HuddleParticipant } from "@/types/chat";

const STUN: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export type MediaMode = "audio" | "video" | "screenshare";

export interface ParticipantStream {
  userId: string;
  stream: MediaStream;
  isScreenShare: boolean;
}

export function useWebRTCMeeting(
  huddleId: number | null,
  channelId: number | null,
  participants: HuddleParticipant[],
  currentUserId: string,
  orgId: string,
  onSignalReceived: (handler: (data: { fromUserId: string; type: string; payload: unknown }) => void) => () => void,
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [participantStreams, setParticipantStreams] = useState<Map<string, ParticipantStream>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const sendSignal = useSendMeetingSignal();

  const createPC = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: STUN });
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    screenStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current!));
    pc.onicecandidate = e => {
      if (e.candidate && huddleId) {
        sendSignal.mutate({ huddleId, type: "ice-candidate", targetUserId: peerId, payload: e.candidate.toJSON() });
      }
    };
    pc.ontrack = e => {
      const stream = e.streams[0];
      if (!stream) return;
      const isScreen = stream.getVideoTracks().some(t => t.label.toLowerCase().includes("screen") || t.contentHint === "detail");
      setParticipantStreams(prev => {
        const next = new Map(prev);
        next.set(peerId, { userId: peerId, stream, isScreenShare: isScreen });
        return next;
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce();
    };
    peerConnections.current.set(peerId, pc);
    return pc;
  }, [huddleId, sendSignal]);

  const handleSignal = useCallback(async (data: { fromUserId: string; type: string; payload: unknown }) => {
    const { fromUserId, type, payload } = data;
    if (type === "offer") {
      const pc = createPC(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (huddleId) sendSignal.mutate({ huddleId, type: "answer", targetUserId: fromUserId, payload: answer });
    } else if (type === "answer") {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
    } else if (type === "ice-candidate") {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
    }
  }, [createPC, huddleId, sendSignal]);

  useEffect(() => {
    if (!huddleId) return;
    return onSignalReceived(handleSignal);
  }, [onSignalReceived, handleSignal, huddleId]);

  useEffect(() => {
    if (!huddleId) return;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicError(null);
        for (const p of participants) {
          if (p.userId === currentUserId || p.leftAt) continue;
          if (peerConnections.current.has(p.userId)) continue;
          const pc = createPC(p.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal.mutate({ huddleId, type: "offer", targetUserId: p.userId, payload: offer });
        }
      } catch (err) {
        setMicError(err instanceof Error ? err.message : "Permission denied");
      }
    };
    init();
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setLocalStream(null);
      setScreenStream(null);
      setParticipantStreams(new Map());
    };
  }, [huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsSharingScreen(true);
      const track = stream.getVideoTracks()[0];
      if (track) track.contentHint = "detail";
      peerConnections.current.forEach(pc => {
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
        });
      });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopScreenShare());
    } catch (_err) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsSharingScreen(false);
  }, []);

  return { localStream, screenStream, participantStreams, isMuted, isCameraOff, isSharingScreen, micError, toggleMute, toggleCamera, startScreenShare, stopScreenShare };
}
