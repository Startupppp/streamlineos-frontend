"use client";

import { useState, useRef, useCallback } from "react";

interface UseScreenShareParams {
  peerConnectionsRef: React.RefObject<Map<string, RTCPeerConnection>>;
}

export function useScreenShare({ peerConnectionsRef }: UseScreenShareParams) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stopScreenShare = useCallback(() => {
    const stream = screenStreamRef.current;
    if (stream) {
      const screenTracks = new Set(stream.getTracks());
      peerConnectionsRef.current.forEach((pc) => {
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
  }, [peerConnectionsRef]);

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
      peerConnectionsRef.current.forEach((pc) => {
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
  }, [peerConnectionsRef, stopScreenShare]);

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

  const cleanupScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsSharingScreen(false);
  }, []);

  return {
    screenStream,
    screenStreamRef,
    isSharingScreen,
    startScreenShare,
    stopScreenShare,
    pauseScreenShare,
    resumeScreenShare,
    cleanupScreenShare,
  };
}
