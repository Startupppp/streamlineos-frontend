"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { MemberPicker } from "@/components/members/member-picker";
import type { MemberOption } from "@/components/members/member-picker-options";
import { useInviteToHuddle } from "@/hooks/api/chat-huddles";
import { describeHuddleInviteError } from "@/hooks/api/chat-huddle-errors";
import { useChatChannel } from "@/hooks/api/chat-core-read";
import type { Huddle } from "@/types/chat";

interface HuddleInviteSectionProps {
  show: boolean;
  currentUserId: string;
  channelId: number;
  huddleId: number;
  participants: Huddle["participants"];
}

export function HuddleInviteSection({
  show,
  currentUserId,
  channelId,
  huddleId,
  participants,
}: HuddleInviteSectionProps) {
  const [inviteUserId, setInviteUserId] = useState("");
  const inviteToHuddle = useInviteToHuddle();
  const { data: channel } = useChatChannel(channelId);
  const candidates = useMemo<MemberOption[]>(() => {
    const inHuddle = new Set(participants.map((p) => p.userId));
    return (channel?.members ?? []).flatMap((member) =>
      member.user && member.user.id !== currentUserId && !inHuddle.has(member.user.id)
        ? [{ id: member.user.id, name: member.user.name, email: member.user.email, image: member.user.image }]
        : [],
    );
  }, [channel?.members, participants, currentUserId]);

  const handlePick = useCallback((userId: string | null) => setInviteUserId(userId ?? ""), []);

  if (!show) return null;

  const handleInvite = () => {
    if (participants.some((p) => p.userId === inviteUserId)) {
      toast.error("Already in the huddle");
      return;
    }
    inviteToHuddle.mutate(
      { huddleId, userIds: [inviteUserId] },
      {
        onSuccess: () => {
          toast.success("Invited to the huddle");
          setInviteUserId("");
        },
        onError: (error) =>
          toast.error(
            describeHuddleInviteError(error, (userId) => candidates.find((m) => m.id === userId)?.name ?? undefined),
          ),
      },
    );
  };

  return (
    <div className="mt-3 border border-border/40 rounded-xl p-3 bg-muted/20">
      <p className="text-dense font-semibold mb-2">Invite to huddle</p>
      <MemberPicker
        candidates={candidates}
        value={inviteUserId}
        onChange={handlePick}
        placeholder="Select member to invite…"
        className="text-xs mb-2"
      />
      <LoadingButton
        size="sm"
        className="text-dense"
        disabled={!inviteUserId}
        isPending={inviteToHuddle.isPending}
        onClick={handleInvite}
      >
        Invite
      </LoadingButton>
    </div>
  );
}
