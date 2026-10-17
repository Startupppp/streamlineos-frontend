"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { statusToneClasses } from "@/lib/design-tokens";
import { useMyApprover } from "@/hooks/api/hr/approvers";
import type { ApprovalRequestKind } from "@/hooks/api/hr/approval-route-schema";

/**
 * HRMS-025 / HRM-B-010 / HR-U-002. The backend refuses an own request unless the
 * caller is the only person who can approve it, and then answers 409 until the
 * approval is confirmed. These pieces are how every approvals surface says so.
 */
export const SELF_APPROVAL_LABEL = "Self-approval (no other approver)";

export const NEEDS_ANOTHER_APPROVER_EXPLANATION =
  "You can't decide your own request. Your approver decides it — ask an HR admin to assign one if nobody can.";

/** Whether the route for the caller's own `kind` request sends it back to them. */
export function useIsSoleSelfApprover(
  kind: ApprovalRequestKind,
  currentUserId: string | undefined,
  enabled = true,
): boolean {
  const { data: route } = useMyApprover(kind, { enabled: enabled && !!currentUserId });
  return route?.ownerSelfApproval === true && route.approver?.userId === currentUserId;
}

export function NeedsAnotherApprover({ className = "" }: { className?: string }) {
  return (
    <span className={`flex max-w-xs flex-col text-xs text-muted-foreground ${className}`}>
      <span className="italic">Needs another approver</span>
      <span>{NEEDS_ANOTHER_APPROVER_EXPLANATION}</span>
    </span>
  );
}

export function SelfApprovalBadge() {
  const tone = statusToneClasses("warning");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${tone.surface} ${tone.rule} ${tone.ink}`}
    >
      {SELF_APPROVAL_LABEL}
    </span>
  );
}

interface SelfApprovalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function SelfApprovalConfirmDialog({
  open,
  onOpenChange,
  subject,
  isPending,
  onConfirm,
}: SelfApprovalConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Approve your own request?"
      description={`Nobody else in your organisation can approve this ${subject.toLowerCase()}, so you are approving your own request. The self-approval is recorded in the audit log.`}
      confirmLabel="Yes, approve my own request"
      isPending={isPending}
      keepOpenOnConfirm
      onConfirm={onConfirm}
    />
  );
}
