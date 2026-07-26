"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useRestoreOrg,
  useTransferOwnership,
  useLeaveOrg,
  useDeleteOrg,
} from "@/hooks/api/organization";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { OrgSettings } from "@/types/organization";

interface Props {
  org: OrgSettings;
}

export function OrgDangerZoneSection({ org }: Props) {
  const canManage = useCan("settings:manage");
  const { update } = useSession();
  const { data: access } = useAccess();
  const isOwner =
    access?.isOrgOwner === true || access?.isPlatformAdmin === true;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [transferOpen, setTransferOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [newOwnerUserId, setNewOwnerUserId] = useState("");

  const archiveMutation = useArchiveOrg();
  const restoreMutation = useRestoreOrg();
  const transferMutation = useTransferOwnership();
  const leaveMutation = useLeaveOrg();
  const deleteMutation = useDeleteOrg();

  const handleOpenTransfer = useCallback(() => {
    setNewOwnerUserId("");
    setTransferOpen(true);
  }, []);

  const handleTransferClose = useCallback(() => setTransferOpen(false), []);

  const handleTransferOpenChange = useCallback((open: boolean) => {
    setTransferOpen(open);
  }, []);

  const handleArchiveOpenChange = useCallback((open: boolean) => {
    setArchiveOpen(open);
  }, []);

  const handleRestoreOpenChange = useCallback((open: boolean) => {
    setRestoreOpen(open);
  }, []);

  const handleLeaveOpenChange = useCallback((open: boolean) => {
    setLeaveOpen(open);
  }, []);

  const handleOpenArchive = useCallback(() => setArchiveOpen(true), []);
  const handleOpenRestore = useCallback(() => setRestoreOpen(true), []);
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
    if (!newOwnerUserId) {
      toast.error("Select a new owner first");
      return;
    }
    transferMutation.mutate(
      { newOwnerUserId },
      {
        onSuccess: () => {
          toast.success("Ownership transferred");
          setTransferOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleConfirmArchive() {
    archiveMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Organization archived");
        setArchiveOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmRestore() {
    restoreMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Organization restored");
        setRestoreOpen(false);
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
        if (data.nextOrgId) {
          await update({ orgId: data.nextOrgId });
          queryClient.clear();
          router.replace("/dashboard");
          router.refresh();
        } else {
          queryClient.clear();
          router.replace("/org-setup");
          router.refresh();
        }
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
        onSuccess: () => {
          toast.success("Organization deleted");
          setDeleteOpen(false);
          clearBackendTokenCache();
          queryClient.clear();
          router.replace("/org-setup");
          router.refresh();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!canManage) return null;

  const deleteMatchValue = org.name ?? org.slug ?? "";
  const deleteEnabled = deleteConfirmation === deleteMatchValue;

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {isOwner && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm font-medium">Transfer Ownership</p>
                <p className="text-xs text-muted-foreground">
                  Permanently transfer org ownership to another member
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={handleOpenTransfer}
              >
                Transfer
              </Button>
            </div>
          )}

          {!isOwner && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="text-sm font-medium">Leave Organization</p>
                <p className="text-xs text-muted-foreground">
                  Remove yourself from this organization. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={handleOpenLeave}
              >
                Leave
              </Button>
            </div>
          )}

          {isOwner && (
            <>
              {org.status === "ARCHIVED" ? (
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm font-medium">Restore Organization</p>
                    <p className="text-xs text-muted-foreground">
                      Restore access for all members
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={handleOpenRestore}
                  >
                    Restore
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm font-medium">Archive Organization</p>
                    <p className="text-xs text-muted-foreground">
                      Members will lose access until the org is restored
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={handleOpenArchive}
                  >
                    Archive
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">Delete Organization</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete this organization and all its data. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={handleOpenDelete}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Dialog open={transferOpen} onOpenChange={handleTransferOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Ownership</DialogTitle>
              <DialogDescription>
                This transfers all owner privileges to the selected member. You will become a regular admin.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <UserCombobox
                value={newOwnerUserId}
                onChange={setNewOwnerUserId}
                placeholder="Select new owner…"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleTransferClose}>
                Cancel
              </Button>
              <LoadingButton
                variant="destructive"
                disabled={!newOwnerUserId}
                isPending={transferMutation.isPending}
                loadingText="Transferring…"
                onClick={handleConfirmTransfer}
              >
                Transfer Ownership
              </LoadingButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!isOwner && (
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

      {isOwner && (
        <>
          <ConfirmDialog
            open={archiveOpen}
            onOpenChange={handleArchiveOpenChange}
            title="Archive Organization"
            description="This will archive your organization. Members will lose access until it's restored."
            onConfirm={handleConfirmArchive}
            isPending={archiveMutation.isPending}
            destructive
          />

          <ConfirmDialog
            open={restoreOpen}
            onOpenChange={handleRestoreOpenChange}
            title="Restore Organization"
            description="Restore this organization and re-enable member access."
            onConfirm={handleConfirmRestore}
            isPending={restoreMutation.isPending}
          />

          <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
                <DialogDescription>
                  This will permanently delete <strong>{org.name ?? org.slug}</strong> and all its data including members, projects, and settings. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label className="text-sm">
                  Type <span className="font-mono font-semibold">{deleteMatchValue}</span> to confirm
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
