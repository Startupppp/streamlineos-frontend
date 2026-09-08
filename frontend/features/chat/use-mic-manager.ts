"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getMicErrorMessage } from "./webrtc-helpers";

interface UseMicManagerParams {
  huddleId: number | null;
  audioInputDeviceId: string | undefined;
  peerConnectionsRef: React.RefObject<Map<string, RTCPeerConnection>>;
}

export function useMicManager({ huddleId, audioInputDeviceId, peerConnectionsRef }: UseMicManagerParams) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicReady, setIsMicReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!huddleId) return;

    let mounted = true;

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (audioInputDeviceId) {
      audioConstraints.deviceId = { exact: audioInputDeviceId };
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
        peerConnectionsRef.current.forEach((pc) => {
          const hasAudioSender = pc.getSenders().some((s) => s.track?.kind === "audio");
          if (!hasAudioSender) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          }
        });
        setIsMicReady(true);
      })
      .catch((err: unknown) => {
        if (mounted) {
          setMicError(getMicErrorMessage(err));
        }
      });

    return () => {
      mounted = false;
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setIsMicReady(false);
    };
  }, [huddleId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      peerConnectionsRef.current.forEach((pc) => {
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
  }, [peerConnectionsRef]);

  const cleanupMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setIsMicReady(false);
    setIsMuted(false);
    setMicError(null);
  }, []);

  return {
    localStream,
    localStreamRef,
    isMicReady,
    isMuted,
    micError,
    toggleMute,
    switchAudioDevice,
    cleanupMic,
  };
}
