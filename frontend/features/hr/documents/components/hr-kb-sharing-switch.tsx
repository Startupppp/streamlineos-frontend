"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ErrorReference } from "@/components/shared/error-reference";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useCan } from "@/hooks/api/access";
import { useHrKbLinkFlagsAdmin, useUpdateHrKbLinkFlags } from "@/hooks/api/kb/hr-link-config";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * The organisation's switch for sharing company documents in the Knowledge Base, for the person who administers the
 * Knowledge Base (`kb:settings:manage`). Everyone else sees nothing here. It is OFF for every organisation until
 * someone turns it on, and turning it on shares nothing by itself: HR still has to classify a document and add it.
 * Turning it off hides the feature at once and leaves everything where it is, so turning it back on restores it.
 */
export function HrKbSharingSwitch() {
  const canManage = useCan("kb:settings:manage");
  const admin = useHrKbLinkFlagsAdmin();
  const update = useUpdateHrKbLinkFlags();
  const [confirming, setConfirming] = useState<"on" | "off" | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  const handleChange = useCallback((next: boolean) => setConfirming(next ? "on" : "off"), []);
  const handleDialogChange = useCallback((open: boolean) => { if (!open) setConfirming(null); }, []);
  const handleConfirm = useCallback(async () => {
    if (confirming === null) return;
    setFailure(null);
    try {
      await update.mutateAsync({ link: confirming === "on" });
      toast.success(confirming === "on" ? "Company documents can now be shared in the Knowledge Base." : "Sharing company documents in the Knowledge Base is off.");
    } catch (error) {
      setFailure(error);
      toast.error(getErrorMessage(error));
    } finally {
      setConfirming(null);
    }
  }, [confirming, update]);

  if (!canManage || !admin.data) return null;
  const on = admin.data.stored.link;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Share company documents in the Knowledge Base</p>
          <p className="text-xs text-muted-foreground">
            {on
              ? "On. HR can classify a document and add it to the Knowledge Base for the people it is meant for."
              : "Off. Nothing about HR documents shows in the Knowledge Base."}
          </p>
        </div>
        <Switch checked={on} onCheckedChange={handleChange} disabled={update.isPending} aria-label="Share company documents in the Knowledge Base" />
      </div>
      {!admin.data.hrModuleEnabled ? (
        <p className="text-xs text-muted-foreground">The HR module has to be enabled for this to work.</p>
      ) : null}
      {failure !== null ? (
        <Alert variant="destructive">
          <AlertTitle>Not changed</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(failure)}</p>
            <ErrorReference error={failure} className="mt-2 justify-start" />
          </AlertDescription>
        </Alert>
      ) : null}
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={handleDialogChange}
        title={confirming === "on" ? "Turn on sharing in the Knowledge Base?" : "Turn off sharing in the Knowledge Base?"}
        description={
          confirming === "on"
            ? "HR will be able to classify documents and add company policies to the Knowledge Base. Nothing is shared until HR adds a document, and personal documents such as payslips and contracts can never be shared."
            : "The feature disappears for everyone straight away. Documents already shared stay as they are and come back if you turn this on again."
        }
        confirmLabel={confirming === "on" ? "Turn on" : "Turn off"}
        destructive={confirming === "off"}
        isPending={update.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirm}
      />
    </div>
  );
}
