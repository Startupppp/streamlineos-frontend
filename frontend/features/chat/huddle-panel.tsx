"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Hand, PhoneOff, Monitor, MonitorOff, Settings, VolumeX, Volume2, MessageSquare, Smile, PauseCircle, PlayCircle } from "lucide-react";
import { MicIcon, MicOffIcon, ChevronDownIcon, ChevronUpIcon, UserPlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { useLeaveHuddle, useSetHuddleMute, useRaiseHand, useKickParticipant, useSetHuddleScreenShare, useSetHuddleDeafen, useInviteToHuddle, useHuddleHeartbeat } from "@/hooks/api/chat-huddles";
import { useEntitlements } from "@/hooks/api/entitlements";
import type { Huddle } from "@/types/chat";
import { getInitials } from "./chat-helpers";
import { useWebRTCHuddle } from "./webrtc-huddle";
import { DeviceSelector, useMediaDevices } from "./device-selector";
import { useAbly } from "ably/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { HuddleChatPanel } from "./huddle-chat-panel";
import { useAblyConnection } from "./use-ably-connection";
import { useHuddleEvents } from "./use-huddle-events";
import { UserCombobox } from "@/components/ui/user-combobox";
import { TruncatedText } from "@/components/ui/truncated-text";
import { HuddleAudioSink } from "./huddle-audio-sink";
import { HuddleScreenShareView } from "./huddle-screenshare-view";
import { HuddleParticipantCard } from "./huddle-participant-card";
import { useHuddleAudioLevels, useElapsedTime } from "./use-huddle-audio-levels";

const HEARTBEAT_INTERVAL_MS = 30_000;

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
  const [inviteUserId, setInviteUserId] = useState("");

  const leaveHuddle = useLeaveHuddle();
  const setMuteMutation = useSetHuddleMute();
  const raiseHandMutation = useRaiseHand();
  const kickParticipant = useKickParticipant();
  const setScreenShareMutation = useSetHuddleScreenShare();
  const setDeafenMutation = useSetHuddleDeafen();
  const inviteToHuddle = useInviteToHuddle();
  const heartbeat = useHuddleHeartbeat();
  const ably = useAbly();
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const { isConnected: isAblyConnected } = useAblyConnection();
  const elapsed = useElapsedTime(huddle.startedAt);

  const {
    audioInputs,
    audioOutputs,
    selectedAudioInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedAudioOutput,
  } = useMediaDevices();

  const myParticipant = huddle.participants.find((p) => p.userId === currentUserId);
  const isHandRaised = myParticipant?.handRaised ?? false;
  const isHost = huddle.startedBy === currentUserId;

  const { data: entitlements } = useEntitlements();
  // Default false until entitlements load so free orgs never briefly enable group invites.
  const groupHuddlesAllowed = entitlements?.features.chatGroupHuddles ?? false;
  const freeHuddleCap = 2; // mirrors FREE_HUDDLE_MAX_PARTICIPANTS on the backend
  const inviteBlockedByPlan =
    !groupHuddlesAllowed && huddle.participants.length >= freeHuddleCap;

  const { localStream, remoteStreams, remoteScreenStreams, screenStream, isMuted, isSharingScreen, micError, realtimeError, toggleMute, switchAudioDevice, getPeerConnection, startScreenShare, stopScreenShare, pauseScreenShare, resumeScreenShare, cleanup } = useWebRTCHuddle(
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

  useEffect(() => {
    const id = setInterval(() => {
      heartbeat.mutate({ huddleId: huddle.id });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [huddle.id, heartbeat.mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (remoteScreenStreams.size > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(true);
    }
  }, [remoteScreenStreams.size]);

  const notifiedMicErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!micError) {
      notifiedMicErrorRef.current = null;
      return;
    }
    if (notifiedMicErrorRef.current === micError) return;
    notifiedMicErrorRef.current = micError;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(true);
    toast.error(micError);
  }, [micError]);

  const expandedForRealtimeRef = useRef(false);
  useEffect(() => {
    if (!realtimeError) {
      expandedForRealtimeRef.current = false;
      return;
    }
    if (expandedForRealtimeRef.current) return;
    expandedForRealtimeRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(true);
  }, [realtimeError]);

  const audioLevels = useHuddleAudioLevels(remoteStreams, localStream, currentUserId);

  const handleLeave = useCallback(() => {
    cleanup();
    leaveHuddle.mutate({ huddleId: huddle.id, channelId });
  }, [cleanup, leaveHuddle, huddle.id, channelId]);

  useHuddleEvents({
    channelId,
    currentUserId,
    participants: huddle.participants,
    onKicked: handleLeave,
  });

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
  }, [isDeafened, setDeafenMutation, huddle.id, channelId]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (!orgId || !isAblyConnected) return;
    setShowEmojiPicker(false);
    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);
    await ch.publish("huddle:reaction", { userId: currentUserId, emoji }).catch(() => {});
  }, [ably, channelId, orgId, currentUserId, isAblyConnected]);

  const participantCount = huddle.participants.length;

  return (
    <div className="border-t border-border/40 bg-card/90 backdrop-blur-sm">
      <HuddleAudioSink
        streams={remoteStreams}
        muted={isDeafened}
        sinkId={selectedAudioOutput}
      />

      <button
        onClick={handleToggleExpanded}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-muted/40 transition-colors"
        aria-label={expanded ? "Collapse huddle panel" : "Expand huddle panel"}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-5 w-5 rounded-full bg-status-success-surface flex items-center justify-center shrink-0">
            <Mic className="h-3 w-3 text-status-success-ink" />
          </div>
          <TruncatedText text={`Huddle · ${elapsed}`} className="text-sm font-medium text-status-success-ink" />
          <span className="text-xs text-muted-foreground">
            {participantCount} {participantCount === 1 ? "participant" : "participants"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {expanded ? (
            <ChevronDownIcon size={16} className="text-muted-foreground" />
          ) : (
            <ChevronUpIcon size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          {micError && (
            <div className="px-3 py-2 text-dense text-status-danger-ink bg-status-danger-surface rounded-lg mb-2 flex items-center gap-2">
              <MicOff className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{micError}</span>
            </div>
          )}

          {realtimeError && (
            <div className="px-3 py-2 text-dense text-status-warning-ink bg-status-warning-surface rounded-lg mb-2">
              {realtimeError}
            </div>
          )}

          <HuddleScreenShareView
            remoteScreenStreams={remoteScreenStreams}
            localScreenStream={screenStream}
            participants={huddle.participants}
            isDeafened={isDeafened}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {huddle.participants.map((participant) => (
              <HuddleParticipantCard
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
            <AnimatedIconButton
              icon={isMuted ? MicOffIcon : MicIcon}
              iconSize={16}
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isMuted && "bg-status-danger-surface text-status-danger-ink hover:bg-status-danger-surface hover:text-status-danger-ink",
              )}
              onClick={handleToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            />

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 rounded-full p-0",
                isHandRaised && "bg-status-warning-surface text-status-warning-ink hover:bg-status-warning-surface hover:text-status-warning-ink",
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
                isSharingScreen && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
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
                className="h-9 w-9 rounded-full p-0 text-primary"
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

            <AnimatedIconButton
              icon={UserPlusIcon}
              iconSize={16}
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => setShowInviteDialog((p) => !p)}
              aria-label="Invite users"
            />

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
              className="h-9 w-9 rounded-full p-0 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
              onClick={handleLeave}
              aria-label="Leave huddle"
              disabled={leaveHuddle.isPending}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>

            <DeviceSelector
              show={showDeviceSelector}
              onClose={() => setShowDeviceSelector(false)}
              audioInputs={audioInputs}
              audioOutputs={audioOutputs}
              selectedAudioInput={selectedAudioInput}
              selectedAudioOutput={selectedAudioOutput}
              onAudioInputChange={setSelectedAudioInput}
              onAudioOutputChange={setSelectedAudioOutput}
            />
          </div>

          {showInviteDialog && inviteBlockedByPlan && (
            <div className="mt-3 border border-border/40 rounded-xl p-3 bg-muted/20">
              <p className="text-dense font-semibold mb-1">Invite to huddle</p>
              <p className="text-dense text-muted-foreground">
                Huddles are one-to-one on the Free plan. Upgrade to start group huddles.
              </p>
            </div>
          )}

          {showInviteDialog && !inviteBlockedByPlan && (
            <div className="mt-3 border border-border/40 rounded-xl p-3 bg-muted/20">
              <p className="text-dense font-semibold mb-2">Invite to huddle</p>
              <UserCombobox
                value={inviteUserId}
                onChange={setInviteUserId}
                placeholder="Select member to invite…"
                excludeUserId={currentUserId}
                className="text-xs mb-2"
              />
              <LoadingButton
                size="sm"
                className="text-dense"
                disabled={!inviteUserId}
                isPending={inviteToHuddle.isPending}
                onClick={() => {
                  if (huddle.participants.some((p) => p.userId === inviteUserId)) {
                    toast.error("Already in the huddle");
                    return;
                  }
                  inviteToHuddle.mutate(
                    { huddleId: huddle.id, userIds: [inviteUserId] },
                    {
                      onSuccess: () => {
                        toast.success("Invited to the huddle");
                        setInviteUserId("");
                        setShowInviteDialog(false);
                      },
                      onError: () => toast.error("Failed to invite"),
                    },
                  );
                }}
              >
                Invite
              </LoadingButton>
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
                <AvatarFallback className="text-micro">
                  {getInitials(p.user?.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <AnimatedIconButton
              icon={isMuted ? MicOffIcon : MicIcon}
              iconSize={12}
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 rounded-full p-0",
                isMuted && "text-status-danger-ink",
              )}
              onClick={handleToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-destructive"
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
