"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getApiError } from "@/lib/api-client";

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
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await apiClient.post("/organization/data/export-request", {});
      toast.success("Export request submitted. You will receive an email when it's ready.");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleDeleteRequest = useCallback(async () => {
    setIsRequestingDelete(true);
    try {
      await apiClient.post("/organization/data/delete-request", {});
      toast.success("Delete request submitted. Your account will be reviewed within 30 days.");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsRequestingDelete(false);
    }
  }, []);

  const handleOpenDeleteDialog = useCallback(() => setDeleteDialogOpen(true), []);
  const handleCloseDeleteDialog = useCallback(() => setDeleteDialogOpen(false), []);
  const handleRetentionChange = useCallback((value: string) => setRetentionDays(value), []);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Data & Privacy</CardTitle>
          <CardDescription>
            Manage data retention, exports, and organization deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Audit log retention</Label>
            <p className="text-xs text-muted-foreground">
              How long to keep audit logs before automatic deletion.
            </p>
            <Select value={retentionDays} onValueChange={handleRetentionChange} disabled={!canEdit}>
              <SelectTrigger className="w-48">
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
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Export organization data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Request a full export of all organization data. You will receive a download link by email.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={!canEdit || isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Request data export
            </Button>
          </div>

          {canEdit && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Delete organization</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently delete this organization and all its data after a 30-day grace period.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleOpenDeleteDialog}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Request organization deletion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              disabled={isRequestingDelete}
            >
              {isRequestingDelete && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Submit deletion request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
