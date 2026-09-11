"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useInviteToHuddle } from "@/hooks/api/chat-huddles";
import type { Huddle } from "@/types/chat";

interface HuddleInviteSectionProps {
  show: boolean;
  inviteBlockedByPlan: boolean;
  currentUserId: string;
  huddleId: number;
  participants: Huddle["participants"];
}

export function HuddleInviteSection({
  show,
  inviteBlockedByPlan,
  currentUserId,
  huddleId,
  participants,
}: HuddleInviteSectionProps) {
  const [inviteUserId, setInviteUserId] = useState("");
  const inviteToHuddle = useInviteToHuddle();

  if (!show) return null;

  if (inviteBlockedByPlan) {
    return (
      <div className="mt-3 border border-border/40 rounded-xl p-3 bg-muted/20">
        <p className="text-dense font-semibold mb-1">Invite to huddle</p>
        <p className="text-dense text-muted-foreground">
          Huddles are one-to-one on the Free plan. Upgrade to start group huddles.
        </p>
      </div>
    );
  }

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
        onError: (error) => toast.error(getErrorMessage(error)),
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
