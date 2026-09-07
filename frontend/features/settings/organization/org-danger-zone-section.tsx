"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAccess, useCan } from "@/hooks/api/access";
import { useArchiveOrg, useLeaveOrg } from "@/hooks/api/organization";
import {
  usePendingOrgTransfers,
  useCancelOrgTransfer,
} from "@/hooks/api/ownership";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { OrgSettings } from "@/types/organization";
import { OrgSettingsCard, OrgSettingsActionRow } from "./org-settings-chrome";
import {
  TransferOwnershipDialog,
  DeleteOrganizationDialog,
} from "./org-danger-zone-dialogs";

interface Props {
  org: OrgSettings;
}

const DESTRUCTIVE_OUTLINE_BTN =
  "shrink-0 border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10 hover:text-destructive";

export function OrgDangerZoneSection({ org }: Props) {
  const canManage = useCan("settings:manage");
  const { update } = useSession();
  const { data: access } = useAccess();
  const isOwner = access?.isOrgOwner === true;
  const isKnownNonOwner = access?.isOrgOwner === false;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [transferOpen, setTransferOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const archiveMutation = useArchiveOrg();
  const cancelTransfer = useCancelOrgTransfer();
  const leaveMutation = useLeaveOrg();
  const pendingTransfersQuery = usePendingOrgTransfers();

  const pendingTransfer = pendingTransfersQuery.data?.data[0] ?? null;

  const handleOpenTransfer = useCallback(() => setTransferOpen(true), []);

  const handleArchiveOpenChange = useCallback((open: boolean) => {
    setArchiveOpen(open);
  }, []);

  const handleLeaveOpenChange = useCallback((open: boolean) => {
    setLeaveOpen(open);
  }, []);

  const handleOpenArchive = useCallback(() => setArchiveOpen(true), []);
  const handleOpenLeave = useCallback(() => setLeaveOpen(true), []);

  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);

  function handleCancelPendingTransfer() {
    if (!pendingTransfer) return;
    cancelTransfer.mutate(pendingTransfer.id, {
      onSuccess: () => toast.success("Ownership transfer cancelled"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmArchive() {
    archiveMutation.mutate(undefined, {
      onSuccess: async (data) => {
        toast.success("Organization archived");
        setArchiveOpen(false);
        clearBackendTokenCache();
        await update(
          data.nextOrgId ? { orgId: data.nextOrgId } : { orgId: null },
        );
        queryClient.clear();
        if (data.nextOrgId) {
          router.replace("/dashboard");
        } else {
          router.replace("/org-setup");
        }
        router.refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  async function handleConfirmLeave() {
    leaveMutation.mutate(undefined, {
      onSuccess: async (data) => {
        toast.success("You have left the organization");
        setLeaveOpen(false);
        clearBackendTokenCache();
        await update(
          data.nextOrgId ? { orgId: data.nextOrgId } : { orgId: null },
        );
        queryClient.clear();
        if (data.nextOrgId) {
          router.replace("/dashboard");
        } else {
          router.replace("/org-setup");
        }
        router.refresh();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  const showOwnerManageActions = canManage && isOwner;
  const showLeave = isKnownNonOwner;
  const showOwnerCannotLeave = isOwner && !canManage;

  if (!showOwnerManageActions && !showLeave && !showOwnerCannotLeave)
    return null;

  return (
    <>
      <OrgSettingsCard
        title="Danger Zone"
        description="Irreversible and high-impact organization actions."
        icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        className="border-destructive/40"
        titleClassName="text-destructive"
        contentClassName="space-y-0 pt-0"
      >
        {showOwnerManageActions && (
          <OrgSettingsActionRow
            title="Transfer Ownership"
            description={
              pendingTransfer
                ? "Awaiting acceptance — the selected member must confirm the transfer"
                : "Send a transfer request to hand over organization ownership"
            }
          >
            {pendingTransfer ? (
              <>
                <Badge
                  variant="outline"
                  className="text-xs gap-1 text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
                >
                  <Clock className="h-3 w-3" />
                  Transfer pending
                </Badge>
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  isPending={cancelTransfer.isPending}
                  onClick={handleCancelPendingTransfer}
                >
                  Cancel
                </LoadingButton>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={DESTRUCTIVE_OUTLINE_BTN}
                onClick={handleOpenTransfer}
                disabled={pendingTransfersQuery.isLoading}
              >
                Transfer
              </Button>
            )}
          </OrgSettingsActionRow>
        )}

        {showLeave && (
          <OrgSettingsActionRow
            title="Leave Organization"
            description="Remove yourself from this organization. This cannot be undone."
            showBorder={false}
          >
            <Button
              variant="outline"
              size="sm"
              className={DESTRUCTIVE_OUTLINE_BTN}
              onClick={handleOpenLeave}
            >
              Leave
            </Button>
          </OrgSettingsActionRow>
        )}

        {showOwnerCannotLeave && (
          <OrgSettingsActionRow
            title="Leave Organization"
            description="Owners cannot leave. Transfer ownership to another member or delete the organization."
            showBorder={false}
          >
            <Button
              variant="outline"
              size="sm"
              className={DESTRUCTIVE_OUTLINE_BTN}
              disabled
            >
              Leave
            </Button>
          </OrgSettingsActionRow>
        )}

        {showOwnerManageActions && org.status !== "ARCHIVED" && (
          <>
            <OrgSettingsActionRow
              title="Archive Organization"
              description="Members will lose access until you restore it from org setup or the organization switcher"
            >
              <Button
                variant="outline"
                size="sm"
                className={DESTRUCTIVE_OUTLINE_BTN}
                onClick={handleOpenArchive}
              >
                Archive
              </Button>
            </OrgSettingsActionRow>

            <OrgSettingsActionRow
              title="Delete Organization"
              description="Permanently delete this organization and all its data. This cannot be undone."
              showBorder={false}
              destructive
            >
              <Button
                variant="outline"
                size="sm"
                className={DESTRUCTIVE_OUTLINE_BTN}
                onClick={handleOpenDelete}
              >
                Delete
              </Button>
            </OrgSettingsActionRow>
          </>
        )}
      </OrgSettingsCard>

      {showOwnerManageActions && (
        <TransferOwnershipDialog open={transferOpen} onOpenChange={setTransferOpen} />
      )}

      {showLeave && (
        <ConfirmDialog
          open={leaveOpen}
          onOpenChange={handleLeaveOpenChange}
          title="Leave Organization"
          description="Are you sure you want to leave this organization? You will lose access immediately and need a new invitation to rejoin."
          confirmLabel="Leave Organization"
          isPending={leaveMutation.isPending}
          onConfirm={handleConfirmLeave}
          destructive
        />
      )}

      {showOwnerManageActions && (
        <>
          <ConfirmDialog
            open={archiveOpen}
            onOpenChange={handleArchiveOpenChange}
            title="Archive Organization"
            description="This will archive your organization. Other members lose access immediately. You can restore it later from org setup or the organization switcher."
            onConfirm={handleConfirmArchive}
            isPending={archiveMutation.isPending}
            destructive
          />

          <DeleteOrganizationDialog
            org={org}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  );
}
