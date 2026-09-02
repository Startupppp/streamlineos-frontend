"use client";

import { useState, useMemo, useCallback } from "react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useActiveHuddle, useRemoveChannelMember } from "@/hooks/api";
import type { ChannelMember } from "@/types/chat";
import { ChannelMemberRow } from "./channel-member-row";
import {
  NO_CURSOR_PAGE,
  panelRevealLabel,
  usePanelRenderWindow,
} from "./panel-render-window";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";

const AddMemberButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function AddMemberButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} type="button" {...hoverHandlers} className={className} {...props}>
      <UserPlusIcon ref={iconRef} size={14} />
      Add
    </button>
  );
});

interface ChannelMembersSectionProps {
  channelId: number;
  currentUserId: string;
  members: ChannelMember[];
  isAdmin: boolean;
  isMultiMemberChannel: boolean;
  onlineUserIds: Set<string>;
  onLeftChannel?: () => void;
  onClose: () => void;
}

export function ChannelMembersSection({
  channelId,
  currentUserId,
  members,
  isAdmin,
  isMultiMemberChannel,
  onlineUserIds,
  onLeftChannel,
  onClose,
}: ChannelMembersSectionProps) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const { data: activeHuddle } = useActiveHuddle(channelId);
  const removeMember = useRemoveChannelMember();

  const mutedInCallUserIds = useMemo(
    () =>
      new Set(
        (activeHuddle?.participants ?? [])
          .filter((p) => !p.leftAt && p.isMuted)
          .map((p) => p.userId),
      ),
    [activeHuddle],
  );

  const { onlineMembers, offlineMembers } = useMemo(() => {
    const byName = (a: ChannelMember, b: ChannelMember) =>
      (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
    const online = members.filter((m) => onlineUserIds.has(m.user?.id ?? "")).sort(byName);
    const offline = members.filter((m) => !onlineUserIds.has(m.user?.id ?? "")).sort(byName);
    return { onlineMembers: online, offlineMembers: offline };
  }, [members, onlineUserIds]);

  const onlineWindow = usePanelRenderWindow(
    onlineMembers.length,
    false,
    NO_CURSOR_PAGE,
    channelId,
  );
  const offlineWindow = usePanelRenderWindow(
    offlineMembers.length,
    false,
    NO_CURSOR_PAGE,
    channelId,
  );

  const existingMemberIds = useMemo(
    () => new Set(members.flatMap((m) => (m.user?.id ? [m.user.id] : []))),
    [members],
  );

  const handleRemoveMember = useCallback(
    async (userId: string, userName: string | null | undefined, isYou: boolean) => {
      const label = isYou ? "leave this channel" : `remove ${userName ?? "this member"}`;
      if (!window.confirm(`Are you sure you want to ${label}?`)) return;

      setRemovingUserId(userId);
      try {
        await removeMember.mutateAsync({ channelId, userId });
        toast.success(isYou ? "You left the channel" : "Member removed");
        if (isYou) {
          onLeftChannel?.();
          onClose();
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setRemovingUserId(null);
      }
    },
    [channelId, removeMember, onLeftChannel, onClose],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h5 className="text-dense font-bold text-muted-foreground uppercase tracking-wider">
          Members ({members.length})
        </h5>
        {isAdmin && isMultiMemberChannel && (
          <AddMemberButton
            onClick={() => setShowAddMembers(true)}
            className="inline-flex items-center gap-1 text-dense font-medium text-primary hover:text-primary/80 transition-colors"
          />
        )}
      </div>

      {onlineMembers.length > 0 && (
        <div className="mb-3">
          <p className="text-micro font-bold text-status-success-ink uppercase tracking-wider px-2 mb-1">
            Online — {onlineMembers.length}
          </p>
          <div role="list" aria-label="Online members" className="space-y-0.5">
            {onlineMembers.slice(0, onlineWindow.visibleCount).map((m, index) => (
              <div
                key={m.user?.id}
                role="listitem"
                aria-posinset={index + 1}
                aria-setsize={onlineMembers.length}
              >
                <ChannelMemberRow
                  member={m}
                  isOnline
                  isMutedInCall={mutedInCallUserIds.has(m.user?.id ?? "")}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isMultiMemberChannel={isMultiMemberChannel}
                  isRemoving={removingUserId === m.user?.id}
                  onRemove={handleRemoveMember}
                />
              </div>
            ))}
          </div>
          {onlineWindow.hasMore ? (
            <button
              type="button"
              onClick={onlineWindow.onLoadMore}
              className="w-full rounded-lg px-2 py-1.5 text-left text-dense font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {panelRevealLabel(onlineWindow, onlineMembers.length, false, "Show all")}
            </button>
          ) : null}
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div>
          <p className="text-micro font-bold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
            Offline — {offlineMembers.length}
          </p>
          <div role="list" aria-label="Offline members" className="space-y-0.5">
            {offlineMembers.slice(0, offlineWindow.visibleCount).map((m, index) => (
              <div
                key={m.user?.id}
                role="listitem"
                aria-posinset={index + 1}
                aria-setsize={offlineMembers.length}
              >
                <ChannelMemberRow
                  member={m}
                  isOnline={false}
                  isMutedInCall={mutedInCallUserIds.has(m.user?.id ?? "")}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isMultiMemberChannel={isMultiMemberChannel}
                  isRemoving={removingUserId === m.user?.id}
                  onRemove={handleRemoveMember}
                />
              </div>
            ))}
          </div>
          {offlineWindow.hasMore ? (
            <button
              type="button"
              onClick={offlineWindow.onLoadMore}
              className="w-full rounded-lg px-2 py-1.5 text-left text-dense font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {panelRevealLabel(offlineWindow, offlineMembers.length, false, "Show all")}
            </button>
          ) : null}
        </div>
      )}

      <AddChannelMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        channelId={channelId}
        existingMemberIds={existingMemberIds}
        isAdmin={isAdmin}
      />
    </div>
  );
}
