"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import { useDeleteOrg, useOrgMembers } from "@/hooks/api/organization";
import { useInitiateOrgTransfer } from "@/hooks/api/ownership";
import { clearBackendTokenCache } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { OrgSettings } from "@/types/organization";

interface DangerZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferOwnershipDialog({ open, onOpenChange }: DangerZoneDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const initiateTransfer = useInitiateOrgTransfer();

  const { data: membersData } = useOrgMembers(1, 100, undefined, {
    enabled: open,
    staleTime: 30_000,
  });

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
  const memberIdUnavailable =
    !!selectedUserId && selectedMembershipId === undefined;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setSelectedUserId("");
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleClose = useCallback(() => handleOpenChange(false), [handleOpenChange]);

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
      (membersData?.data ?? []).find((m) => m.userId === selectedUserId)?.name ??
      "the selected member";
    initiateTransfer.mutate(
      { toMembershipId: selectedMembershipId },
      {
        onSuccess: () => {
          toast.success(
            `Ownership transfer sent — ${recipientName} must accept it to take effect`,
          );
          handleOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              Transfer cannot be initiated — member identifier not exposed by
              the current API. A backend update is required.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
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
  );
}

interface DeleteOrganizationDialogProps extends DangerZoneDialogProps {
  org: OrgSettings;
}

export function DeleteOrganizationDialog({
  org,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const deleteMutation = useDeleteOrg();
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMatchValue = org.name ?? org.slug ?? "";
  const deleteEnabled = deleteConfirmation === deleteMatchValue;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setDeleteConfirmation("");
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const handleClose = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const handleConfirmationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDeleteConfirmation(e.target.value);
    },
    [],
  );

  function handleConfirmDelete() {
    if (deleteConfirmation !== deleteMatchValue) return;
    deleteMutation.mutate(
      { confirmation: deleteConfirmation },
      {
        onSuccess: async (data) => {
          toast.success(
            data.nextOrgId
              ? "Organization deleted. Switched to your remaining organization."
              : "Organization deleted. Create or join an organization to continue.",
          );
          handleOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Delete Organization
          </DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>{org.name ?? org.slug}</strong>{" "}
            and all its data including members, projects, and settings. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
          You will be switched to another organization you belong to. If none
          remain, you will be taken to organization setup.
        </div>
        <div className="space-y-2 py-2">
          <Label htmlFor="delete-confirmation" className="text-sm">
            Type{" "}
            <span className="font-mono font-semibold">{deleteMatchValue}</span>{" "}
            to confirm
          </Label>
          <Input
            id="delete-confirmation"
            value={deleteConfirmation}
            onChange={handleConfirmationChange}
            placeholder={deleteMatchValue}
            className="font-mono"
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
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
  );
}
