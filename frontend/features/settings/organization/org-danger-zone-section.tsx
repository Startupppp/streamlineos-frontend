"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useCan } from "@/hooks/api/access";
import {
  useArchiveOrg,
  useRestoreOrg,
  useTransferOwnership,
} from "@/hooks/api/organization";
import { getApiError } from "@/lib/api-client";
import type { OrgSettings } from "@/types/organization";

interface Props {
  org: OrgSettings;
}

export function OrgDangerZoneSection({ org }: Props) {
  const canManage = useCan("settings:manage");

  const [transferOpen, setTransferOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");

  const archiveMutation = useArchiveOrg();
  const restoreMutation = useRestoreOrg();
  const transferMutation = useTransferOwnership();

  const handleOpenTransfer = useCallback(() => {
    setNewOwnerUserId("");
    setTransferOpen(true);
  }, []);

  const handleTransferOpenChange = useCallback((open: boolean) => {
    setTransferOpen(open);
  }, []);

  const handleArchiveOpenChange = useCallback((open: boolean) => {
    setArchiveOpen(open);
  }, []);

  const handleRestoreOpenChange = useCallback((open: boolean) => {
    setRestoreOpen(open);
  }, []);

  const handleOpenArchive = useCallback(() => setArchiveOpen(true), []);
  const handleOpenRestore = useCallback(() => setRestoreOpen(true), []);

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
        onError: (err) => toast.error(getApiError(err)),
      }
    );
  }

  function handleConfirmArchive() {
    archiveMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Organization archived");
        setArchiveOpen(false);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  function handleConfirmRestore() {
    restoreMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Organization restored");
        setRestoreOpen(false);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  if (!canManage) return null;

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

          {org.status === "ARCHIVED" ? (
            <div className="flex items-center justify-between py-3">
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
            <div className="flex items-center justify-between py-3">
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
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!newOwnerUserId || transferMutation.isPending}
              onClick={handleConfirmTransfer}
            >
              {transferMutation.isPending ? "Transferring…" : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
