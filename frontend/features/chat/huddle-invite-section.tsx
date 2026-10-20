"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useInviteToHuddle } from "@/hooks/api/chat-huddles";
import { describeHuddleInviteError } from "@/hooks/api/chat-huddle-errors";
import { useMemberDirectory } from "@/hooks/api/members/use-member-directory";
import type { Huddle } from "@/types/chat";

interface HuddleInviteSectionProps {
  show: boolean;
  currentUserId: string;
  huddleId: number;
  participants: Huddle["participants"];
}

export function HuddleInviteSection({
  show,
  currentUserId,
  huddleId,
  participants,
}: HuddleInviteSectionProps) {
  const [inviteUserId, setInviteUserId] = useState("");
  const inviteToHuddle = useInviteToHuddle();
  const selectedIds = useMemo(() => (inviteUserId ? [inviteUserId] : []), [inviteUserId]);
  const { selectedMembers } = useMemberDirectory(
    { kind: "org" },
    { selectedIds, enabled: show && Boolean(inviteUserId) },
  );

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
            describeHuddleInviteError(error, (userId) => selectedMembers.find((m) => m.id === userId)?.name ?? undefined),
          ),
      },
    );
  };

  return (
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
        onClick={handleInvite}
      >
        Invite
      </LoadingButton>
    </div>
  );
}
