"use client";

import { useEffect, useRef, useState } from "react";

export interface AudioLevelMap {
  [userId: string]: number;
}

interface AnalyzerEntry {
  context: AudioContext;
  analyzer: AnalyserNode;
  source: MediaStreamAudioSourceNode;
}

export function useHuddleAudioLevels(
  remoteStreams: Map<string, MediaStream>,
  localStream: MediaStream | null,
  currentUserId: string,
): AudioLevelMap {
  const [levels, setLevels] = useState<AudioLevelMap>({});
  const analyzersRef = useRef<Map<string, AnalyzerEntry>>(new Map());

  useEffect(() => {
    const allStreams = new Map(remoteStreams);
    if (localStream) allStreams.set(currentUserId, localStream);

    const existingIds = new Set(analyzersRef.current.keys());
    const currentIds = new Set(allStreams.keys());

    for (const userId of existingIds) {
      if (!currentIds.has(userId)) {
        const entry = analyzersRef.current.get(userId);
        if (entry) {
          entry.source.disconnect();
          entry.context.close().catch(() => {});
          analyzersRef.current.delete(userId);
        }
      }
    }

    for (const [userId, stream] of allStreams) {
      if (!analyzersRef.current.has(userId)) {
        try {
          const context = new AudioContext();
          const source = context.createMediaStreamSource(stream);
          const analyzer = context.createAnalyser();
          analyzer.fftSize = 256;
          source.connect(analyzer);
          analyzersRef.current.set(userId, { context, analyzer, source });
        } catch {}
      }
    }

    const interval = setInterval(() => {
      const next: AudioLevelMap = {};
      for (const [userId, entry] of analyzersRef.current) {
        const data = new Uint8Array(entry.analyzer.frequencyBinCount);
        entry.analyzer.getByteFrequencyData(data);
        const sum = data.reduce((acc, val) => acc + val, 0);
        next[userId] = sum / data.length / 255;
      }
      setLevels(next);
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [remoteStreams, localStream, currentUserId]);

  useEffect(() => {
    const analyzers = analyzersRef.current;
    return () => {
      for (const entry of analyzers.values()) {
        entry.source.disconnect();
        entry.context.close().catch(() => {});
      }
      analyzers.clear();
    };
  }, []);

  return levels;
}

export function useElapsedTime(startedAt: Date | string): string {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${m}:${String(s).padStart(2, "0")}`,
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}
