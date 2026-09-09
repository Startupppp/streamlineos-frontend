"use client";

import { useCallback, useState } from "react";
import { MessageSquare, PhoneOff, Video, VideoOff } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon, UserPlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLeaveHuddle, useKickParticipant, useHuddleHeartbeat } from "@/hooks/api/chat-huddles";
import { useEntitlements } from "@/hooks/api/entitlements";
import type { Huddle } from "@/types/chat";
import { HuddleChatPanel } from "./huddle-chat-panel";
import { useHuddleEvents } from "./use-huddle-events";
import { TruncatedText } from "@/components/ui/truncated-text";
import { HuddleParticipantCard } from "./huddle-participant-card";
import { useElapsedTime } from "./use-elapsed-time";
import { HuddleInviteSection } from "./huddle-invite-section";
import { HuddleMiniBar } from "./huddle-mini-bar";

const FREE_PLAN_HUDDLE_CAP = 2;

interface HuddlePanelProps {
  huddle: Huddle;
  channelId: number;
  currentUserId: string;
}

export function HuddlePanel({ huddle, channelId, currentUserId }: HuddlePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHuddleChat, setShowHuddleChat] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const leaveHuddle = useLeaveHuddle();
  const kickParticipant = useKickParticipant();
  useHuddleHeartbeat(huddle.id);
  const elapsed = useElapsedTime(huddle.startedAt);

  const isHost = huddle.startedBy === currentUserId;
  const meetingUrl = huddle.meetingUrl;
  const participantCount = huddle.participants.length;

  const { data: entitlements } = useEntitlements();
  const groupHuddlesAllowed = entitlements?.features.chatGroupHuddles ?? false;
  const inviteBlockedByPlan = !groupHuddlesAllowed && participantCount >= FREE_PLAN_HUDDLE_CAP;

  const handleLeave = useCallback(() => {
    leaveHuddle.mutate({ huddleId: huddle.id, channelId });
  }, [leaveHuddle, huddle.id, channelId]);

  useHuddleEvents({
    channelId,
    currentUserId,
    participants: huddle.participants,
    onKicked: handleLeave,
  });

  const handleToggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleToggleHuddleChat = useCallback(() => {
    setShowHuddleChat((prev) => !prev);
  }, []);

  const handleCloseHuddleChat = useCallback(() => {
    setShowHuddleChat(false);
  }, []);

  const handleToggleInvite = useCallback(() => {
    setShowInviteDialog((prev) => !prev);
  }, []);

  const handleKick = useCallback(
    (targetUserId: string) => {
      kickParticipant.mutate({ huddleId: huddle.id, channelId, targetUserId });
    },
    [kickParticipant, huddle.id, channelId],
  );

  return (
    <div className="border-t border-border/40 bg-card/90">
      <button
        type="button"
        onClick={handleToggleExpanded}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-muted/40 transition-colors"
        aria-label={expanded ? "Collapse huddle panel" : "Expand huddle panel"}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-5 w-5 rounded-full bg-status-success-surface flex items-center justify-center shrink-0">
            <Video className="h-3 w-3 text-status-success-ink" />
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
          {meetingUrl ? (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Video className="h-4 w-4 shrink-0" />
              Join meeting
            </a>
          ) : (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-status-warning-surface px-3 py-2 text-dense text-status-warning-ink">
              <VideoOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="flex-1">
                This huddle has no meeting link. Leave and start a new huddle to get one.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {huddle.participants.map((participant) => {
              const participantUserId = participant.userId;
              const isSelf = participantUserId !== null && participantUserId === currentUserId;
              const canKick = isHost && participantUserId !== null && !isSelf;
              return (
                <HuddleParticipantCard
                  key={participant.id}
                  participant={participant}
                  isCurrentUser={isSelf}
                  isHost={isHost}
                  onKick={canKick ? () => handleKick(participantUserId) : undefined}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-9 w-9 rounded-full p-0", showHuddleChat && "bg-muted/60")}
              onClick={handleToggleHuddleChat}
              aria-label="Huddle chat"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <AnimatedIconButton
              icon={UserPlusIcon}
              iconSize={16}
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={handleToggleInvite}
              aria-label="Invite users"
            />

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
          </div>

          <HuddleInviteSection
            show={showInviteDialog}
            inviteBlockedByPlan={inviteBlockedByPlan}
            currentUserId={currentUserId}
            huddleId={huddle.id}
            participants={huddle.participants}
          />

          {showHuddleChat && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <HuddleChatPanel
                channelId={channelId}
                currentUserId={currentUserId}
                onClose={handleCloseHuddleChat}
              />
            </div>
          )}
        </div>
      )}

      {!expanded && (
        <HuddleMiniBar
          participants={huddle.participants}
          meetingUrl={meetingUrl}
          onLeave={handleLeave}
          isLeavePending={leaveHuddle.isPending}
        />
      )}
    </div>
  );
}
