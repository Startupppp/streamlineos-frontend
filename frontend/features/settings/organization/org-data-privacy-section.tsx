"use client";

import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  OrgSettingsCard,
  OrgSettingsActionRow,
  SettingsField,
} from "./org-settings-chrome";

interface OrgDataPrivacySectionProps {
  canEdit: boolean;
}

const RETENTION_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "0", label: "Indefinitely" },
];

export function OrgDataPrivacySection({ canEdit }: OrgDataPrivacySectionProps) {
  const [retentionDays, setRetentionDays] = useState("365");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);

  const handleDeleteRequest = useCallback(async () => {
    setIsRequestingDelete(true);
    try {
      await apiClient.post("/organization/data/delete-request", {});
      toast.success("Delete request submitted. Your account will be reviewed within 30 days.");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsRequestingDelete(false);
    }
  }, []);

  const handleOpenDeleteDialog = useCallback(() => setDeleteDialogOpen(true), []);
  const handleCloseDeleteDialog = useCallback(() => setDeleteDialogOpen(false), []);
  const handleRetentionChange = useCallback((value: string) => setRetentionDays(value), []);

  return (
    <>
      <OrgSettingsCard
        title="Data & Privacy"
        description="Manage data retention and organization deletion."
        icon={<Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        contentClassName="space-y-1"
      >
        <div className="flex flex-col gap-2.5 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <SettingsField
            label="Audit log retention"
            className="flex-1"
          >
            <p className="text-xs text-muted-foreground mb-1.5">
              How long to keep audit logs before automatic deletion.
            </p>
            <Select value={retentionDays} onValueChange={handleRetentionChange} disabled={!canEdit}>
              <SelectTrigger className="h-8 w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </div>

        {canEdit && (
          <OrgSettingsActionRow
            title="Delete organization"
            description="Permanently delete this organization and all its data after a 30-day grace period."
            showBorder={false}
            destructive
            className="border-t border-border mt-2 pt-3"
          >
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              iconClassName="mr-0.5"
              variant="destructive"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleOpenDeleteDialog}
            >
              Request deletion
            </AnimatedIconButton>
          </OrgSettingsActionRow>
        )}
      </OrgSettingsCard>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete organization
            </DialogTitle>
            <DialogDescription>
              This will submit a deletion request. All data will be permanently removed after a{" "}
              <span className="font-semibold">30-day grace period</span>. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
            <p className="text-xs font-medium text-destructive">This will permanently delete:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>All employees and user accounts</li>
              <li>All payroll, HR, and billing data</li>
              <li>All documents and audit logs</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={handleDeleteRequest}
              isPending={isRequestingDelete}
              loadingText="Submitting…"
            >
              Submit deletion request
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
