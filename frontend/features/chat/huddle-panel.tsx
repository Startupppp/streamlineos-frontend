"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Hand, PhoneOff, ChevronUp, ChevronDown, CameraOff, Monitor, MonitorOff, Settings, UserMinus, VolumeX, Volume2, MessageSquare, UserPlus, Smile, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useLeaveHuddle, useSetHuddleMute, useRaiseHand, useKickParticipant, useSetHuddleScreenShare, useSetHuddleDeafen, useInviteToHuddle } from "@/hooks/api/chat-huddles";
import type { Huddle, HuddleParticipant } from "@/types/chat";
import { getInitials } from "./chat-helpers";
import { useWebRTCHuddle } from "./webrtc-huddle";
import { DeviceSelector, useMediaDevices } from "./device-selector";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useNetworkQuality } from "./use-network-quality";
import { HuddleChatPanel } from "./huddle-chat-panel";

interface AudioLevelMap {
  [userId: string]: number;
}

function useElapsedTime(startedAt: Date | string): string {
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

function useAudioLevels(
  remoteStreams: Map<string, MediaStream>,
  localStream: MediaStream | null,
  currentUserId: string,
): AudioLevelMap {
  const [levels, setLevels] = useState<AudioLevelMap>({});
  const analyzersRef = useRef<Map<string, { context: AudioContext; analyzer: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());

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
        } catch {
        }
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

interface HuddlePanelProps {
  huddle: Huddle;
  channelId: number;
  currentUserId: string;
}

export function HuddlePanel({ huddle, channelId, currentUserId }: HuddlePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [showHuddleChat, setShowHuddleChat] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const leaveHuddle = useLeaveHuddle();
  const setMuteMutation = useSetHuddleMute();
  const raiseHandMutation = useRaiseHand();
  const kickParticipant = useKickParticipant();
  const setScreenShareMutation = useSetHuddleScreenShare();
  const setDeafenMutation = useSetHuddleDeafen();
  const inviteToHuddle = useInviteToHuddle();
  const ably = useAbly();
  const { data: session } = useSession();
  const orgId = (session as { orgId?: string } | null)?.orgId;
  const elapsed = useElapsedTime(huddle.startedAt);

  const { selectedAudioInput } = useMediaDevices();

  const myParticipant = huddle.participants.find((p) => p.userId === currentUserId);
  const isHandRaised = myParticipant?.handRaised ?? false;
  const isHost = huddle.startedBy === currentUserId;

  const { localStream, remoteStreams, screenStream, isMuted, isSharingScreen, micError, toggleMute, switchAudioDevice, getPeerConnection, startScreenShare, stopScreenShare, pauseScreenShare, resumeScreenShare, cleanup } = useWebRTCHuddle(
    huddle.id,
    channelId,
    huddle.participants,
    currentUserId,
    { audioInput: selectedAudioInput !== "default" ? selectedAudioInput : undefined },
  );

  useEffect(() => {
    if (selectedAudioInput && selectedAudioInput !== "default") {
      switchAudioDevice(selectedAudioInput);
    }
  }, [selectedAudioInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const audioLevels = useAudioLevels(remoteStreams, localStream, currentUserId);

  useEffect(() => {
    if (!orgId) return;
    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);

    const handleJoined = (msg: InboundMessage) => {
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      const participant = huddle.participants.find((p) => p.userId === data.userId);
      toast(`${participant?.user?.name ?? "Someone"} joined the huddle`);
    };

    const handleLeft = (msg: InboundMessage) => {
      const data = msg.data as { userId: string };
      if (data.userId === currentUserId) return;
      const participant = huddle.participants.find((p) => p.userId === data.userId);
      toast(`${participant?.user?.name ?? "Someone"} left the huddle`);
    };

    ch.subscribe("huddle:user_joined", handleJoined);
    ch.subscribe("huddle:user_left", handleLeft);

    const userCh = ably.channels.get(`notifications:${orgId}:${currentUserId}`);
    const handleKicked = () => {
      toast.error("You were removed from the huddle");
      cleanup();
      leaveHuddle.mutate({ huddleId: huddle.id, channelId });
    };
    userCh.subscribe("huddle:kicked", handleKicked);

    return () => {
      ch.unsubscribe("huddle:user_joined", handleJoined);
      ch.unsubscribe("huddle:user_left", handleLeft);
      userCh.unsubscribe("huddle:kicked", handleKicked);
    };
  }, [ably, orgId, channelId, currentUserId, huddle.participants, huddle.id, cleanup, leaveHuddle]);

  const handleLeave = useCallback(() => {
    cleanup();
    leaveHuddle.mutate({ huddleId: huddle.id, channelId });
  }, [cleanup, leaveHuddle, huddle.id, channelId]);

  const handleToggleMute = useCallback(() => {
    toggleMute();
    setMuteMutation.mutate({ huddleId: huddle.id, channelId, muted: !isMuted });
  }, [toggleMute, setMuteMutation, huddle.id, channelId, isMuted]);

  const handleToggleHand = useCallback(() => {
    raiseHandMutation.mutate({ huddleId: huddle.id, channelId, raised: !isHandRaised });
  }, [raiseHandMutation, huddle.id, channelId, isHandRaised]);

  const handleToggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleKick = useCallback(
    (targetUserId: string) => {
      kickParticipant.mutate({ huddleId: huddle.id, channelId, targetUserId });
    },
    [kickParticipant, huddle.id, channelId],
  );

  const handleStartScreenShare = useCallback(async () => {
    await startScreenShare();
    setScreenShareMutation.mutate({ huddleId: huddle.id, channelId, isScreenSharing: true });
  }, [startScreenShare, setScreenShareMutation, huddle.id, channelId]);

  const handleStopScreenShare = useCallback(() => {
    stopScreenShare();
    setScreenShareMutation.mutate({ huddleId: huddle.id, channelId, isScreenSharing: false });
  }, [stopScreenShare, setScreenShareMutation, huddle.id, channelId]);

  const handleToggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setIsDeafened(next);
    setDeafenMutation.mutate({ huddleId: huddle.id, channelId, deafened: next });
    audioElementsRef.current.forEach((el) => { el.muted = next; });
  }, [isDeafened, setDeafenMutation, huddle.id, channelId]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!orgId) return;
    setShowEmojiPicker(false);
    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);
    await ch.publish("huddle:reaction", { userId: currentUserId, emoji });
  }, [ably, channelId, orgId, currentUserId]);

  const participantCount = huddle.participants.length;

  return (
    <div className="border-t border-border/40 bg-card/90 backdrop-blur-sm">
      <button
        onClick={handleToggleExpanded}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-muted/40 transition-colors"
        aria-label={expanded ? "Collapse huddle panel" : "Expand huddle panel"}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Mic className="h-3 w-3 text-green-500" />
          </div>
          <span className="text-sm font-medium text-green-500 truncate">
            Huddle · {elapsed}
          </span>
          <span className="text-xs text-muted-foreground">
            {participantCount} {participantCount === 1 ? "participant" : "participants"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {micError && (
            <div className="px-3 py-2 text-[11px] text-red-500 bg-red-500/10 rounded-lg mb-2 flex items-center gap-2">
              <MicOff className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{micError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {huddle.participants.map((participant) => (
              <ParticipantCard
                key={participant.userId}
                participant={participant}
                audioLevel={audioLevels[participant.userId] ?? 0}
                isCurrentUser={participant.userId === currentUserId}
                isHost={isHost}
                onKick={isHost && participant.userId !== currentUserId ? () => handleKick(participant.userId) : undefined}
                peerConnection={participant.userId !== currentUserId ? getPeerConnection(participant.userId) ?? null : null}
              />
            ))}
          </div>

          <div className="relative flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isMuted && "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500",
              )}
              onClick={handleToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isHandRaised && "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500",
              )}
              onClick={handleToggleHand}
              aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
            >
              <Hand className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isSharingScreen && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-500",
              )}
              onClick={isSharingScreen ? handleStopScreenShare : handleStartScreenShare}
              aria-label={isSharingScreen ? "Stop sharing screen" : "Share screen"}
            >
              {isSharingScreen ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>

            {isSharingScreen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-full p-0"
                onClick={pauseScreenShare}
                aria-label="Pause screen share"
              >
                <PauseCircle className="h-4 w-4" />
              </Button>
            )}

            {screenStream && !isSharingScreen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-full p-0 text-blue-500"
                onClick={resumeScreenShare}
                aria-label="Resume screen share"
              >
                <PlayCircle className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isDeafened && "bg-muted text-foreground hover:bg-muted/80",
              )}
              onClick={handleToggleDeafen}
              aria-label={isDeafened ? "Undeafen" : "Deafen"}
            >
              {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn("h-9 w-9 rounded-full p-0", showHuddleChat && "bg-muted/60")}
              onClick={() => setShowHuddleChat((p) => !p)}
              aria-label="Huddle chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-9 w-9 rounded-full p-0", showEmojiPicker && "bg-muted/60")}
                onClick={() => setShowEmojiPicker((p) => !p)}
                aria-label="Send reaction"
              >
                <Smile className="h-4 w-4" />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex gap-1 bg-background border border-border/60 rounded-xl p-2 shadow-xl z-50">
                  {["👍", "❤️", "😂", "🎉", "👏", "🔥"].map((emoji) => (
                    <button key={emoji} onClick={() => sendReaction(emoji)} className="text-lg hover:scale-125 transition-transform">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => setShowInviteDialog((p) => !p)}
              aria-label="Invite users"
            >
              <UserPlus className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                showDeviceSelector && "bg-muted/60",
              )}
              onClick={() => setShowDeviceSelector((p) => !p)}
              aria-label="Audio & video settings"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
              onClick={handleLeave}
              aria-label="Leave huddle"
              disabled={leaveHuddle.isPending}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>

            <DeviceSelector show={showDeviceSelector} onClose={() => setShowDeviceSelector(false)} />
          </div>

          {showInviteDialog && (
            <div className="mt-3 border border-border/40 rounded-xl p-3 bg-muted/20">
              <p className="text-[11px] font-semibold mb-2">Invite to huddle</p>
              <input
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="Enter user ID to invite..."
                className="w-full text-[12px] bg-background border border-border/50 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500/40 mb-2"
              />
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => {
                  if (inviteQuery.trim()) {
                    inviteToHuddle.mutate({ huddleId: huddle.id, userIds: [inviteQuery.trim()] });
                    toast.success("Invited to the huddle");
                    setInviteQuery("");
                    setShowInviteDialog(false);
                  }
                }}
              >
                Invite
              </Button>
            </div>
          )}

          {showHuddleChat && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <HuddleChatPanel
                channelId={channelId}
                currentUserId={currentUserId}
                onClose={() => setShowHuddleChat(false)}
              />
            </div>
          )}
        </div>
      )}

      {!expanded && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {huddle.participants.slice(0, 4).map((p) => (
              <Avatar key={p.userId} className="h-5 w-5 border border-background">
                <AvatarImage src={resolveImageUrl(p.user?.image)} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(p.user?.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 rounded-full p-0",
                isMuted && "text-red-500",
              )}
              onClick={handleToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-red-500"
              onClick={handleLeave}
              aria-label="Leave huddle"
              disabled={leaveHuddle.isPending}
            >
              <PhoneOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParticipantCardProps {
  participant: HuddleParticipant;
  audioLevel: number;
  isCurrentUser: boolean;
  isHost: boolean;
  onKick?: () => void;
  peerConnection: RTCPeerConnection | null;
}

function ParticipantCard({ participant, audioLevel, isCurrentUser, isHost, onKick, peerConnection }: ParticipantCardProps) {
  const isSpeaking = audioLevel > 0.05;
  const networkQuality = useNetworkQuality(peerConnection);
  const qualityColor =
    networkQuality === "excellent"
      ? "bg-emerald-500"
      : networkQuality === "good"
        ? "bg-yellow-400"
        : networkQuality === "poor"
          ? "bg-red-500"
          : "bg-zinc-400";

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
      <div className="relative">
        {!isCurrentUser && (
          <span className={cn("absolute -top-1 -right-1 h-2 w-2 rounded-full z-10", qualityColor)} />
        )}
        <Avatar
          className={cn(
            "h-10 w-10 border-2 transition-colors",
            isSpeaking ? "border-green-500" : "border-transparent",
          )}
        >
          <AvatarImage src={resolveImageUrl(participant.user?.image)} />
          <AvatarFallback className="text-[11px] font-semibold">
            {getInitials(participant.user?.name)}
          </AvatarFallback>
        </Avatar>
        {participant.isMuted && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
            <MicOff className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        )}
        {participant.handRaised && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500/10 border border-border flex items-center justify-center text-[9px]">
            <Hand className="h-2.5 w-2.5 text-amber-500" />
          </span>
        )}
        {participant.isCameraOff && (
          <span className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
            <CameraOff className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        )}
        {participant.isScreenSharing && (
          <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full bg-blue-500/10 border border-border flex items-center justify-center">
            <Monitor className="h-2.5 w-2.5 text-blue-500" />
          </span>
        )}
      </div>
      <span className="text-[11px] text-center truncate w-full leading-tight">
        {isCurrentUser ? "You" : (participant.user?.name ?? "Unknown")}
      </span>
      {isHost && !isCurrentUser && onKick && (
        <button
          onClick={onKick}
          className="text-[10px] text-red-500/60 hover:text-red-500 transition-colors flex items-center gap-0.5"
          aria-label="Remove from huddle"
        >
          <UserMinus className="h-2.5 w-2.5" />
          Remove
        </button>
      )}
    </div>
  );
}
