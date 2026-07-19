"use client";

import { useEffect, useRef } from "react";
import { Monitor } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HuddleParticipant } from "@/types/chat";

interface ScreenTileProps {
  stream: MediaStream;
  label: string;
  muted: boolean;
}

function ScreenTile({ stream, label, muted }: ScreenTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch(() => {});
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/40 bg-black">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full max-h-64 object-contain" />
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60">
        <Monitor className="h-2.5 w-2.5 text-white" />
        <TruncatedText text={label} className="text-[10px] text-white max-w-[160px]" />
      </div>
    </div>
  );
}

interface HuddleScreenShareViewProps {
  remoteScreenStreams: Map<string, MediaStream>;
  localScreenStream: MediaStream | null;
  participants: HuddleParticipant[];
  isDeafened: boolean;
}

export function HuddleScreenShareView({
  remoteScreenStreams,
  localScreenStream,
  participants,
  isDeafened,
}: HuddleScreenShareViewProps) {
  if (remoteScreenStreams.size === 0 && !localScreenStream) return null;

  const nameFor = (userId: string): string => {
    const participant = participants.find((p) => p.userId === userId);
    return participant?.user?.name ?? "Unknown";
  };

  return (
    <div className="grid grid-cols-1 gap-2 mb-3">
      {Array.from(remoteScreenStreams.entries()).map(([userId, stream]) => (
        <ScreenTile
          key={userId}
          stream={stream}
          label={`${nameFor(userId)} is presenting`}
          muted={isDeafened}
        />
      ))}
      {localScreenStream && (
        <ScreenTile stream={localScreenStream} label="You are presenting" muted />
      )}
    </div>
  );
}
