"use client";

import { useState, useMemo, useCallback } from "react";
import { UserPlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useLeaveChannel,
  useRemoveChannelMember,
  useUpdateChannelMemberRole,
} from "@/hooks/api/chat-core-mutations-b";
import type { ChannelMember } from "@/types/chat";
import { ChannelMemberRow } from "./channel-member-row";
import {
  NO_CURSOR_PAGE,
  panelRevealLabel,
  usePanelRenderWindow,
} from "./panel-render-window";
import { AddChannelMembersDialog } from "./add-channel-members-dialog";

interface PendingRemoval {
  userId: string;
  userName: string | null | undefined;
  isYou: boolean;
}

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
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(
    null,
  );
  const removeMember = useRemoveChannelMember();
  const leaveChannel = useLeaveChannel();
  const updateRole = useUpdateChannelMemberRole();
  const changingRoleUserId = updateRole.isPending
    ? (updateRole.variables?.userId ?? null)
    : null;

  const handleChangeRole = useCallback(
    (
      userId: string,
      role: ChannelMember["role"],
      userName: string | null | undefined,
    ) => {
      updateRole.mutate(
        { channelId, userId, role },
        {
          onSuccess: () =>
            toast.success(
              role === "ADMIN"
                ? `${userName ?? "Member"} is now a channel admin`
                : `${userName ?? "Member"} is no longer a channel admin`,
            ),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [channelId, updateRole],
  );

  const { onlineMembers, offlineMembers } = useMemo(() => {
    const byName = (a: ChannelMember, b: ChannelMember) =>
      (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
    const online = members
      .filter((m) => onlineUserIds.has(m.user?.id ?? ""))
      .sort(byName);
    const offline = members
      .filter((m) => !onlineUserIds.has(m.user?.id ?? ""))
      .sort(byName);
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

  const handleRequestRemove = useCallback(
    (userId: string, userName: string | null | undefined, isYou: boolean) => {
      setPendingRemoval({ userId, userName, isYou });
    },
    [],
  );

  function handleRemovalOpenChange(open: boolean) {
    if (!open) setPendingRemoval(null);
  }

  function handleOpenAddMembers() {
    setShowAddMembers(true);
  }

  async function handleConfirmRemoval() {
    if (!pendingRemoval) return;
    const { userId, isYou } = pendingRemoval;
    try {
      if (isYou) await leaveChannel.mutateAsync(channelId);
      else await removeMember.mutateAsync({ channelId, userId });
      setPendingRemoval(null);
      toast.success(isYou ? "You left the channel" : "Member removed");
      if (isYou) {
        onLeftChannel?.();
        onClose();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const removingUserId = removeMember.isPending
    ? (pendingRemoval?.userId ?? null)
    : null;
  const removalName = pendingRemoval?.userName ?? "this member";

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h5 className="text-dense font-bold text-muted-foreground uppercase tracking-wider">
          Members ({members.length})
        </h5>
        {isAdmin && isMultiMemberChannel && (
          <AnimatedIconButton
            type="button"
            icon={UserPlusIcon}
            iconSize={14}
            variant="ghost"
            size="sm"
            onClick={handleOpenAddMembers}
            className="h-7 gap-1 px-2 text-dense font-medium text-primary hover:text-primary/80"
          >
            Add
          </AnimatedIconButton>
        )}
      </div>

      {onlineMembers.length > 0 && (
        <div className="mb-3">
          <p className="text-micro font-bold text-status-success-ink uppercase tracking-wider px-2 mb-1">
            Online — {onlineMembers.length}
          </p>
          <div role="list" aria-label="Online members" className="space-y-0.5">
            {onlineMembers
              .slice(0, onlineWindow.visibleCount)
              .map((m, index) => (
                <div
                  key={m.user?.id}
                  role="listitem"
                  aria-posinset={index + 1}
                  aria-setsize={onlineMembers.length}
                >
                  <ChannelMemberRow
                    member={m}
                    isOnline
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isMultiMemberChannel={isMultiMemberChannel}
                    isRemoving={removingUserId === m.user?.id}
                    onRemove={handleRequestRemove}
                    isChangingRole={changingRoleUserId === m.user?.id}
                    onChangeRole={handleChangeRole}
                  />
                </div>
              ))}
          </div>
          <InfiniteScrollSentinel
            hasNextPage={onlineWindow.hasMore}
            isFetchingNextPage={false}
            onLoadMore={onlineWindow.onLoadMore}
            label={panelRevealLabel(
              onlineWindow,
              onlineMembers.length,
              false,
              "Show all",
            )}
            className="py-1"
          />
        </div>
      )}

      {offlineMembers.length > 0 && (
        <div>
          <p className="text-micro font-bold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            Offline — {offlineMembers.length}
          </p>
          <div role="list" aria-label="Offline members" className="space-y-0.5">
            {offlineMembers
              .slice(0, offlineWindow.visibleCount)
              .map((m, index) => (
                <div
                  key={m.user?.id}
                  role="listitem"
                  aria-posinset={index + 1}
                  aria-setsize={offlineMembers.length}
                >
                  <ChannelMemberRow
                    member={m}
                    isOnline={false}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    isMultiMemberChannel={isMultiMemberChannel}
                    isRemoving={removingUserId === m.user?.id}
                    onRemove={handleRequestRemove}
                    isChangingRole={changingRoleUserId === m.user?.id}
                    onChangeRole={handleChangeRole}
                  />
                </div>
              ))}
          </div>
          <InfiniteScrollSentinel
            hasNextPage={offlineWindow.hasMore}
            isFetchingNextPage={false}
            onLoadMore={offlineWindow.onLoadMore}
            label={panelRevealLabel(
              offlineWindow,
              offlineMembers.length,
              false,
              "Show all",
            )}
            className="py-1"
          />
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={handleRemovalOpenChange}
        title={
          pendingRemoval?.isYou
            ? "Leave this channel?"
            : `Remove ${removalName}?`
        }
        description={
          pendingRemoval?.isYou
            ? "You stop receiving its messages and it leaves your conversation list."
            : `${removalName} loses access to this channel and its history.`
        }
        confirmLabel={pendingRemoval?.isYou ? "Leave channel" : "Remove member"}
        destructive
        isPending={removeMember.isPending || leaveChannel.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmRemoval}
      />

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
