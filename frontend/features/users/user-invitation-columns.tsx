"use client";

import { useCallback } from "react";
import { format, isPast } from "date-fns";
import { RefreshCw } from "lucide-react";
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
import { USER_INVITE_ROLES, formatRoleLabel } from "./user-invite-roles";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type InvitationStatusFilter = "all" | InvitationStatus;

const STATUS_CLASSES: Record<InvitationStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  accepted:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  expired:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  revoked:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
};

function getInvitationStatus(invitation: Invitation): InvitationStatus {
  if (invitation.status === "REVOKED") return "revoked";
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
  role,
  disabled,
  onChange,
}: {
  invitationId: string;
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
      <SelectTrigger className="h-6 w-fit min-w-[7rem] border-input bg-card text-[11px]">
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
          aria-label="Resend invitation"
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
          aria-label="Re-invite"
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Re-invite
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
          aria-label="Cancel invitation"
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
        <Badge variant="outline" className="h-4 px-1.5 py-0 text-[9px]">
          {formatRoleLabel(invitation.role)}
        </Badge>
      );
    return (
      <InvitationRoleSelect
        invitationId={invitation.id}
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
          className={`h-4 px-1.5 py-0 text-[9px] capitalize ${STATUS_CLASSES[invitationStatus]}`}
        >
          {invitationStatus}
        </Badge>
        {showDeliveryFailed ? (
          <Badge
            variant="outline"
            className="h-4 border-red-200 bg-red-50 px-1.5 py-0 text-[9px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
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
