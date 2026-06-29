"use client";

import { useEffect, useRef, useState } from "react";

export function useAudioLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  const animFrameRef = useRef<number>(0);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().some((t) => t.enabled)) {
      setLevel(0);
      return;
    }

    const ctx = new AudioContext();
    contextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(avg / 128);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ctx.close().catch(() => {});
      setLevel(0);
    };
  }, [stream]);

  return level;
}
