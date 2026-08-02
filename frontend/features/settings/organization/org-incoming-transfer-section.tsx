"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useIncomingOrgTransfers,
  useAcceptTransfer,
  useDeclineTransfer,
  type IncomingTransferRecord,
} from "@/hooks/api/ownership";
import { getErrorMessage } from "@/lib/get-error-message";
import { MODULE_LABELS } from "@/components/rbac/permission-matrix-types";
import { OrgSettingsCard } from "./org-settings-chrome";

type OrgTransferRow = IncomingTransferRecord & { scope: "ORGANIZATION" };
type ModuleTransferRow = IncomingTransferRecord & {
  scope: "MODULE";
  moduleKey: string;
};
type TransferRow = OrgTransferRow | ModuleTransferRow;

function assertNever(x: never): never {
  throw new Error(`Unhandled transfer scope: ${String(x)}`);
}

function formatModuleKey(key: string): string {
  return MODULE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

function toTransferRow(r: IncomingTransferRecord): TransferRow | null {
  if (r.scope === "MODULE") {
    if (r.moduleKey === null) return null;
    return { ...r, scope: "MODULE" as const, moduleKey: r.moduleKey };
  }
  return { ...r, scope: "ORGANIZATION" as const };
}

interface TransferCopy {
  heading: string;
  consequence: string;
  acceptTitle: string;
  acceptBody: string;
  declineTitle: string;
  declineBody: string;
  successMessage: string;
}

function getTransferCopy(t: TransferRow): TransferCopy {
  const senderLabel = t.fromName ?? t.fromEmail ?? "The current owner";
  switch (t.scope) {
    case "ORGANIZATION":
      return {
        heading: `${senderLabel} is transferring organization ownership to you`,
        consequence:
          "Accepting makes you the org owner and demotes the current owner. This cannot be undone.",
        acceptTitle: "Accept Organization Ownership",
        acceptBody:
          "You will become the organization owner immediately. The current owner will be demoted to admin. This action is permanent and cannot be reversed — proceed only if you are ready to take full responsibility for this organization.",
        declineTitle: "Decline Ownership Transfer",
        declineBody:
          "The transfer request will be declined and the current owner will remain as owner. You can be re-invited to accept ownership later.",
        successMessage: "Ownership accepted — you are now the organization owner",
      };
    case "MODULE": {
      const modLabel = formatModuleKey(t.moduleKey);
      return {
        heading: `${senderLabel} is transferring ${modLabel} module ownership to you`,
        consequence: `Accepting makes you the ${modLabel} module owner. The current module owner will lose that role.`,
        acceptTitle: `Accept ${modLabel} Module Ownership`,
        acceptBody: `You will become the ${modLabel} module owner immediately. The current module owner will lose that role. This action is permanent.`,
        declineTitle: "Decline Module Ownership Transfer",
        declineBody: `The transfer request will be declined and the current ${modLabel} module owner will remain as owner.`,
        successMessage: `Module ownership accepted — you are now the ${modLabel} module owner`,
      };
    }
    default:
      return assertNever(t);
  }
}

interface TransferItemRowProps {
  transfer: TransferRow;
  isAcceptPending: boolean;
  isDeclinePending: boolean;
  onAccept: (transfer: TransferRow) => void;
  onDecline: (transfer: TransferRow) => void;
}

function TransferItemRow({
  transfer,
  isAcceptPending,
  isDeclinePending,
  onAccept,
  onDecline,
}: TransferItemRowProps) {
  const copy = getTransferCopy(transfer);
  const expiresAt = new Date(transfer.expiresAt);
  const expiresLabel = expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function handleAccept() {
    onAccept(transfer);
  }

  function handleDecline() {
    onDecline(transfer);
  }

  return (
    <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">{copy.heading}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {copy.consequence}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Badge
            variant="outline"
            className="text-xs gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700/50 dark:bg-amber-500/10"
          >
            <Clock className="h-3 w-3" />
            Expires {expiresLabel}
          </Badge>
          {transfer.reason && (
            <span className="text-xs text-muted-foreground">
              Reason: {transfer.reason}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 [&_button]:flex-1 sm:[&_button]:flex-none">
        <LoadingButton
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          isPending={isDeclinePending}
          onClick={handleDecline}
        >
          Decline
        </LoadingButton>
        <LoadingButton
          variant="default"
          size="sm"
          className="h-7 text-xs"
          isPending={isAcceptPending}
          onClick={handleAccept}
        >
          Accept
        </LoadingButton>
      </div>
    </div>
  );
}

interface PendingAction {
  type: "accept" | "decline";
  transfer: TransferRow;
}

export function OrgIncomingTransferSection() {
  const { data: incomingData } = useIncomingOrgTransfers();

  const transfers = (incomingData?.data ?? [])
    .map(toTransferRow)
    .filter((t): t is TransferRow => t !== null);

  const acceptMutation = useAcceptTransfer();
  const declineMutation = useDeclineTransfer();

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const handleRequestAccept = useCallback((transfer: TransferRow) => {
    setPendingAction({ type: "accept", transfer });
  }, []);

  const handleRequestDecline = useCallback((transfer: TransferRow) => {
    setPendingAction({ type: "decline", transfer });
  }, []);

  const handleAcceptDialogChange = useCallback((open: boolean) => {
    if (!open) setPendingAction(null);
  }, []);

  const handleDeclineDialogChange = useCallback((open: boolean) => {
    if (!open) setPendingAction(null);
  }, []);

  function handleConfirmAccept() {
    if (!pendingAction || pendingAction.type !== "accept") return;
    const { transfer } = pendingAction;
    const copy = getTransferCopy(transfer);
    acceptMutation.mutate(transfer.id, {
      onSuccess: () => {
        toast.success(copy.successMessage);
        setPendingAction(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmDecline() {
    if (!pendingAction || pendingAction.type !== "decline") return;
    const { transfer } = pendingAction;
    declineMutation.mutate(
      { transferId: transfer.id },
      {
        onSuccess: () => {
          toast.success("Ownership transfer declined");
          setPendingAction(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (transfers.length === 0) {
    return null;
  }

  const activeAcceptId =
    pendingAction?.type === "accept" ? pendingAction.transfer.id : null;
  const activeDeclineId =
    pendingAction?.type === "decline" ? pendingAction.transfer.id : null;
  const acceptCopy =
    pendingAction?.type === "accept"
      ? getTransferCopy(pendingAction.transfer)
      : null;
  const declineCopy =
    pendingAction?.type === "decline"
      ? getTransferCopy(pendingAction.transfer)
      : null;

  return (
    <>
      <OrgSettingsCard
        title="Incoming Ownership Transfer"
        icon={<ArrowRightLeft className="h-3.5 w-3.5 shrink-0" />}
        className="border-amber-300/60 dark:border-amber-700/50"
        titleClassName="text-amber-800 dark:text-amber-400"
        contentClassName="space-y-0 divide-y divide-border"
      >
        {transfers.map((transfer) => (
          <TransferItemRow
            key={transfer.id}
            transfer={transfer}
            isAcceptPending={
              acceptMutation.isPending && activeAcceptId === transfer.id
            }
            isDeclinePending={
              declineMutation.isPending && activeDeclineId === transfer.id
            }
            onAccept={handleRequestAccept}
            onDecline={handleRequestDecline}
          />
        ))}
      </OrgSettingsCard>

      <ConfirmDialog
        open={pendingAction?.type === "accept"}
        onOpenChange={handleAcceptDialogChange}
        title={acceptCopy?.acceptTitle ?? "Accept Ownership"}
        description={acceptCopy?.acceptBody ?? ""}
        confirmLabel="Accept Ownership"
        isPending={acceptMutation.isPending}
        onConfirm={handleConfirmAccept}
      />

      <ConfirmDialog
        open={pendingAction?.type === "decline"}
        onOpenChange={handleDeclineDialogChange}
        title={declineCopy?.declineTitle ?? "Decline Transfer"}
        description={declineCopy?.declineBody ?? ""}
        confirmLabel="Decline Transfer"
        isPending={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
      />
    </>
  );
}
