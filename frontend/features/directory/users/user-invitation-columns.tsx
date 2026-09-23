"use client";

import { useCallback } from "react";
import { format, isPast } from "date-fns";
import { RefreshCw, Link2 as LinkIcon } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invitation } from "@/hooks/api/users";
import { USER_INVITE_ROLES, formatRoleLabel } from "@/lib/constants/user-invite-roles";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked" | "declined";
export type InvitationStatusFilter = "all" | InvitationStatus;

export const INVITATION_STATUS_FILTERS = [
  "all",
  "pending",
  "accepted",
  "expired",
  "revoked",
  "declined",
] as const satisfies readonly InvitationStatusFilter[];

export function resolveInvitationStatusFilter(raw: string | null): InvitationStatusFilter {
  return INVITATION_STATUS_FILTERS.find((candidate) => candidate === raw) ?? "all";
}

const STATUS_CLASSES: Record<InvitationStatus, string> = {
  pending:
    "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  accepted:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  expired:
    "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  revoked:
    "bg-muted text-foreground border-border",
  declined:
    "bg-muted text-muted-foreground border-border",
};

function getInvitationStatus(invitation: Invitation): InvitationStatus {
  if (invitation.status === "REVOKED") return "revoked";
  if (invitation.status === "DECLINED") return "declined";
  if (invitation.acceptedAt || invitation.status === "ACCEPTED") return "accepted";
  if (isPast(new Date(invitation.expiresAt))) return "expired";
  return "pending";
}

export function isInvitationResendPending(
  isPending: boolean,
  pendingInvitationId: string | undefined,
  invitationId: string,
): boolean {
  return isPending && pendingInvitationId === invitationId;
}

export function isInvitationRoleChangePending(
  isPending: boolean,
  pendingInvitationId: string | undefined,
  invitationId: string,
): boolean {
  return isPending && pendingInvitationId === invitationId;
}

function InvitationRoleSelect({
  invitationId,
  email,
  role,
  disabled,
  onChange,
}: {
  invitationId: string;
  email: string;
  role: string;
  disabled: boolean;
  onChange: (invitationId: string, role: string) => void;
}) {
  const handleValueChange = useCallback(
    (nextRole: string) => onChange(invitationId, nextRole),
    [invitationId, onChange],
  );

  return (
    <Select value={role} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={`Role for ${email}`}
        className="h-6 w-fit min-w-[7rem] border-input bg-card text-dense"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        {USER_INVITE_ROLES.map((inviteRole) => (
          <SelectItem key={inviteRole.value} value={inviteRole.value}>
            {inviteRole.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface InvitationActionCellProps {
  invitation: Invitation;
  canInvite: boolean;
  canCancelInvitation: boolean;
  isResending: boolean;
  resendingInvitationId: string | undefined;
  isCancelling: boolean;
  onResend: (invitationId: string, kind: "resend" | "reinvite") => void;
  onCopyJoinLink: (invitationId: string) => void;
  isCopyingJoinLink: boolean;
  copyingJoinLinkInvitationId: string | undefined;
  onCancelRequest: (invitationId: string) => void;
}

function InvitationActionCell({
  invitation,
  canInvite,
  canCancelInvitation,
  isResending,
  resendingInvitationId,
  isCancelling,
  onResend,
  onCopyJoinLink,
  isCopyingJoinLink,
  copyingJoinLinkInvitationId,
  onCancelRequest,
}: InvitationActionCellProps) {
  const invitationStatus = getInvitationStatus(invitation);
  const isResendingRow = isInvitationResendPending(
    isResending,
    resendingInvitationId,
    invitation.id,
  );
  const isActionable = invitationStatus === "pending" || invitationStatus === "expired";
  const canResend = isActionable && canInvite;
  const canReinvite = invitationStatus === "revoked" && canInvite;
  const canCancel = isActionable && canCancelInvitation;

  const handleResend = useCallback(
    () => onResend(invitation.id, "resend"),
    [invitation.id, onResend],
  );
  const handleReinvite = useCallback(
    () => onResend(invitation.id, "reinvite"),
    [invitation.id, onResend],
  );
  const handleCancel = useCallback(
    () => onCancelRequest(invitation.id),
    [invitation.id, onCancelRequest],
  );
  const handleCopyJoinLink = useCallback(
    () => onCopyJoinLink(invitation.id),
    [invitation.id, onCopyJoinLink],
  );
  const isCopyingRow =
    isCopyingJoinLink && copyingJoinLinkInvitationId === invitation.id;

  if (!canResend && !canReinvite && !canCancel) return null;
  return (
    <div className="flex items-center gap-0.5">
      {canResend && (
        <LoadingButton
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleResend}
          isPending={isResendingRow}
          disabled={isCancelling}
          aria-label={`Resend invitation to ${invitation.email}`}
        >
          <RefreshCw className="h-4 w-4" />
        </LoadingButton>
      )}
      {canReinvite && (
        <LoadingButton
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleReinvite}
          isPending={isResendingRow}
          disabled={isCancelling}
          aria-label={`Re-invite ${invitation.email}`}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Re-invite
        </LoadingButton>
      )}
      {canResend && (
        <LoadingButton
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopyJoinLink}
          isPending={isCopyingRow}
          disabled={isCancelling}
          aria-label={`Copy join link for ${invitation.email}`}
          title="Copy a fresh join link. This replaces any link already sent."
        >
          <LinkIcon className="h-4 w-4" />
        </LoadingButton>
      )}
      {canCancel && (
        <AnimatedIconButton
          icon={XIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleCancel}
          disabled={isResendingRow || isCancelling}
          aria-label={`Cancel invitation to ${invitation.email}`}
        />
      )}
    </div>
  );
}

interface InvitationColumnsOptions {
  canInvite: boolean;
  canCancelInvitation: boolean;
  isChangingRole: boolean;
  changingInvitationId: string | undefined;
  isResending: boolean;
  resendingInvitationId: string | undefined;
  isCancelling: boolean;
  onRoleChange: (invitationId: string, role: string) => void;
  onResend: (invitationId: string, kind: "resend" | "reinvite") => void;
  onCopyJoinLink: (invitationId: string) => void;
  isCopyingJoinLink: boolean;
  copyingJoinLinkInvitationId: string | undefined;
  onCancelRequest: (invitationId: string) => void;
}

export function getInvitationColumns({
  canInvite,
  canCancelInvitation,
  isChangingRole,
  changingInvitationId,
  isResending,
  resendingInvitationId,
  isCancelling,
  onRoleChange,
  onResend,
  onCopyJoinLink,
  isCopyingJoinLink,
  copyingJoinLinkInvitationId,
  onCancelRequest,
}: InvitationColumnsOptions): DataTableColumn<Invitation>[] {
  function renderEmail(invitation: Invitation) {
    return invitation.email;
  }

  function renderRole(invitation: Invitation) {
    const invitationStatus = getInvitationStatus(invitation);
    const editable =
      (invitationStatus === "pending" || invitationStatus === "expired") && canInvite;
    if (!editable)
      return (
        <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">
          {formatRoleLabel(invitation.role)}
        </Badge>
      );
    return (
      <InvitationRoleSelect
        invitationId={invitation.id}
        email={invitation.email}
        role={invitation.role}
        disabled={isInvitationRoleChangePending(
          isChangingRole,
          changingInvitationId,
          invitation.id,
        )}
        onChange={onRoleChange}
      />
    );
  }

  function renderInvitedDate(invitation: Invitation) {
    return format(new Date(invitation.createdAt), "MMM d, yyyy");
  }

  function renderExpiryDate(invitation: Invitation) {
    return format(new Date(invitation.expiresAt), "MMM d, yyyy");
  }

  function renderStatus(invitation: Invitation) {
    const invitationStatus = getInvitationStatus(invitation);
    const showDeliveryFailed =
      invitation.deliveryFailed &&
      (invitationStatus === "pending" || invitationStatus === "expired");
    return (
      <div className="flex items-center gap-1">
        <Badge
          variant="outline"
          className={`h-4 px-1.5 py-0 text-micro capitalize ${STATUS_CLASSES[invitationStatus]}`}
        >
          {invitationStatus}
        </Badge>
        {showDeliveryFailed ? (
          <Badge
            variant="outline"
            className="h-4 border-status-danger-rule bg-status-danger-surface px-1.5 py-0 text-micro text-status-danger-ink"
            title="The invitation email could not be delivered. Resend to try again."
          >
            Email failed
          </Badge>
        ) : null}
      </div>
    );
  }

  function renderActions(invitation: Invitation) {
    return (
      <InvitationActionCell
        invitation={invitation}
        canInvite={canInvite}
        canCancelInvitation={canCancelInvitation}
        isResending={isResending}
        onCopyJoinLink={onCopyJoinLink}
        isCopyingJoinLink={isCopyingJoinLink}
        copyingJoinLinkInvitationId={copyingJoinLinkInvitationId}
        resendingInvitationId={resendingInvitationId}
        isCancelling={isCancelling}
        onResend={onResend}
        onCancelRequest={onCancelRequest}
      />
    );
  }

  return [
    { key: "email", header: "Email", cell: renderEmail },
    { key: "role", header: "Role", cell: renderRole },
    {
      key: "invited",
      header: "Invited",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: renderInvitedDate,
    },
    {
      key: "expires",
      header: "Expires",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: renderExpiryDate,
    },
    { key: "status", header: "Status", cell: renderStatus },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[110px]",
      className: "w-[110px]",
      cell: renderActions,
    },
  ];
}
