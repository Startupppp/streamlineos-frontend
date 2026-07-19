"use client";

import { useEffect, useRef } from "react";

interface AudioSinkProps {
  stream: MediaStream;
  muted: boolean;
  sinkId?: string;
}

function hasSetSinkId(
  el: HTMLAudioElement,
): el is HTMLAudioElement & { setSinkId(sinkId: string): Promise<void> } {
  return "setSinkId" in el;
}

function AudioSink({ stream, muted, sinkId }: AudioSinkProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !sinkId || sinkId === "default") return;
    if (hasSetSinkId(el)) {
      el.setSinkId(sinkId).catch(() => {});
    }
  }, [sinkId]);

  return <audio ref={audioRef} autoPlay className="hidden" />;
}

interface HuddleAudioSinkProps {
  streams: Map<string, MediaStream>;
  muted: boolean;
  sinkId?: string;
}

export function HuddleAudioSink({ streams, muted, sinkId }: HuddleAudioSinkProps) {
  return (
    <>
      {Array.from(streams.entries()).map(([userId, stream]) => (
        <AudioSink key={userId} stream={stream} muted={muted} sinkId={sinkId} />
      ))}
    </>
  );
}
