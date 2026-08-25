"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useAccess, useCan } from "@/hooks/api/access";
import {
  useArchiveOrg,
  useLeaveOrg,
  useDeleteOrg,
  useOrgMembers,
} from "@/hooks/api/organization";
import {
  useInitiateOrgTransfer,
  usePendingOrgTransfers,
  useCancelOrgTransfer,
} from "@/hooks/api/ownership";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { OrgSettings } from "@/types/organization";
import { OrgSettingsCard, OrgSettingsActionRow } from "./org-settings-chrome";

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
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const archiveMutation = useArchiveOrg();
  const initiateTransfer = useInitiateOrgTransfer();
  const cancelTransfer = useCancelOrgTransfer();
  const leaveMutation = useLeaveOrg();
  const deleteMutation = useDeleteOrg();
  const pendingTransfersQuery = usePendingOrgTransfers();

  const { data: membersData } = useOrgMembers(1, 100, undefined, {
    enabled: transferOpen,
    staleTime: 30_000,
  });

  const pendingTransfer = pendingTransfersQuery.data?.data[0] ?? null;

  const membershipIdByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of membersData?.data ?? []) {
      if (m.membershipId !== undefined) {
        map.set(m.userId, m.membershipId);
      }
    }
    return map;
  }, [membersData]);

  const selectedMembershipId = selectedUserId
    ? membershipIdByUserId.get(selectedUserId)
    : undefined;

  const handleOpenTransfer = useCallback(() => {
    setSelectedUserId("");
    setTransferOpen(true);
  }, []);

  const handleTransferClose = useCallback(() => setTransferOpen(false), []);

  const handleTransferOpenChange = useCallback((open: boolean) => {
    setTransferOpen(open);
  }, []);

  const handleArchiveOpenChange = useCallback((open: boolean) => {
    setArchiveOpen(open);
  }, []);

  const handleLeaveOpenChange = useCallback((open: boolean) => {
    setLeaveOpen(open);
  }, []);

  const handleOpenArchive = useCallback(() => setArchiveOpen(true), []);
  const handleOpenLeave = useCallback(() => setLeaveOpen(true), []);

  const handleOpenDelete = useCallback(() => {
    setDeleteConfirmation("");
    setDeleteOpen(true);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteConfirmation("");
    setDeleteOpen(open);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteConfirmation("");
    setDeleteOpen(false);
  }, []);

  const handleDeleteConfirmationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDeleteConfirmation(e.target.value);
    },
    [],
  );

  function handleConfirmTransfer() {
    if (!selectedUserId) {
      toast.error("Select a new owner first");
      return;
    }
    if (selectedMembershipId === undefined) {
      toast.error(
        "Member ID unavailable — a backend update is required to complete the transfer",
      );
      return;
    }
    const recipientName =
      (membersData?.data ?? []).find((m) => m.userId === selectedUserId)
        ?.name ?? "the selected member";
    initiateTransfer.mutate(
      { toMembershipId: selectedMembershipId },
      {
        onSuccess: () => {
          toast.success(
            `Ownership transfer sent — ${recipientName} must accept it to take effect`,
          );
          setTransferOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

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

  function handleConfirmDelete() {
    const confirmValue = org.name ?? org.slug ?? "";
    if (deleteConfirmation !== confirmValue) return;
    deleteMutation.mutate(
      { confirmation: deleteConfirmation },
      {
        onSuccess: async (data) => {
          toast.success(
            data.nextOrgId
              ? "Organization deleted. Switched to your remaining organization."
              : "Organization deleted. Create or join an organization to continue.",
          );
          setDeleteOpen(false);
          clearBackendTokenCache();
          await update({ orgId: data.nextOrgId });
          queryClient.clear();
          router.replace(data.nextOrgId ? "/dashboard" : "/org-setup");
          router.refresh();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const deleteMatchValue = org.name ?? org.slug ?? "";
  const deleteEnabled = deleteConfirmation === deleteMatchValue;
  const memberIdUnavailable =
    !!selectedUserId && selectedMembershipId === undefined;
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
        <Dialog open={transferOpen} onOpenChange={handleTransferOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Ownership</DialogTitle>
              <DialogDescription>
                This sends a transfer request the recipient must accept before
                ownership changes. You remain the owner until the request is
                accepted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <UserCombobox
                value={selectedUserId}
                onChange={setSelectedUserId}
                placeholder="Select new owner…"
              />
              {memberIdUnavailable && (
                <p className="text-xs text-destructive">
                  Transfer cannot be initiated — member identifier not exposed
                  by the current API. A backend update is required.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleTransferClose}>
                Cancel
              </Button>
              <LoadingButton
                variant="destructive"
                disabled={!selectedUserId || memberIdUnavailable}
                isPending={initiateTransfer.isPending}
                loadingText="Sending request…"
                onClick={handleConfirmTransfer}
              >
                Send Transfer Request
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

          <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  Delete Organization
                </DialogTitle>
                <DialogDescription>
                  This will permanently delete{" "}
                  <strong>{org.name ?? org.slug}</strong> and all its data
                  including members, projects, and settings. This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
                You will be switched to another organization you belong to. If
                none remain, you will be taken to organization setup.
              </div>
              <div className="space-y-2 py-2">
                <Label className="text-sm">
                  Type{" "}
                  <span className="font-mono font-semibold">
                    {deleteMatchValue}
                  </span>{" "}
                  to confirm
                </Label>
                <Input
                  value={deleteConfirmation}
                  onChange={handleDeleteConfirmationChange}
                  placeholder={deleteMatchValue}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleDeleteClose}>
                  Cancel
                </Button>
                <LoadingButton
                  variant="destructive"
                  disabled={!deleteEnabled}
                  isPending={deleteMutation.isPending}
                  loadingText="Deleting…"
                  onClick={handleConfirmDelete}
                >
                  Delete Organization
                </LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
