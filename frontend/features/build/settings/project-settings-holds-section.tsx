"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useSetLegalHold } from "@/hooks/api/build/project-retention-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { PmSection, PmPanel } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { retentionDaysLabel } from "@/features/build/settings/project-settings-retention-sections";
import type { ProjectsRetentionSettingsGetSettingsResponse } from "@/contracts/build-contracts.generated";

interface HoldsSectionProps {
  settings: ProjectsRetentionSettingsGetSettingsResponse;
  projectId: number;
  canEdit: boolean;
}

export function HoldsSection({ settings, projectId, canEdit }: HoldsSectionProps) {
  const setLegalHold = useSetLegalHold(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [pendingActive, setPendingActive] = useState<boolean>(false);

  const handleHoldReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHoldReason(e.target.value);
    },
    [],
  );

  const handleRequestSetHold = useCallback(() => {
    setPendingActive(true);
    setConfirmOpen(true);
  }, []);

  const handleRequestRemoveHold = useCallback(() => {
    setPendingActive(false);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setLegalHold.mutate(
      {
        active: pendingActive,
        reason: pendingActive && holdReason.length > 0 ? holdReason : undefined,
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.success(pendingActive ? "Legal hold applied" : "Legal hold removed");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [setLegalHold, pendingActive, holdReason]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    if (!setLegalHold.isPending) setConfirmOpen(open);
  }, [setLegalHold.isPending]);

  return (
    <div className="flex flex-col gap-4">
      <PmSection index={0}>
        <PmPanel className="p-4" solid>
          <div className="mb-3 border-b border-border pb-3">
            <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Legal hold</h3>
            <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
              A legal hold records that this project&apos;s data may be subject to litigation or
              regulatory review. Because no automated retention deletion runs yet, the hold
              documents that intent rather than interrupting an active process.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                settings.legalHold ? "bg-status-warning-fill" : "bg-status-success-fill",
              )}
              aria-hidden
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">
                {settings.legalHold ? "Legal hold is active" : "No legal hold"}
              </span>
              {settings.legalHold && settings.legalHoldReason ? (
                <p className={cn("text-xs text-muted-foreground", TEXT_BODY)}>
                  Reason: {settings.legalHoldReason}
                </p>
              ) : null}
              {settings.legalHold && settings.legalHoldSetAt ? (
                <p className="text-xs text-muted-foreground">
                  Applied:{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(settings.legalHoldSetAt))}
                </p>
              ) : null}
              {settings.legalHold ? (
                <p className="text-xs text-muted-foreground">
                  Current retention period:{" "}
                  <span className="font-medium">
                    {retentionDaysLabel(settings.closedTicketRetentionDays)} (hold recorded)
                  </span>
                </p>
              ) : null}
            </div>
          </div>
          {canEdit ? (
            <div className="mt-4 flex justify-end">
              {settings.legalHold ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRequestRemoveHold}
                >
                  Remove legal hold
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRequestSetHold}
                >
                  <ShieldAlert className="mr-1.5 h-4 w-4" aria-hidden />
                  Apply legal hold
                </Button>
              )}
            </div>
          ) : null}
        </PmPanel>
      </PmSection>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={handleConfirmOpenChange}
        title={pendingActive ? "Apply legal hold?" : "Remove legal hold?"}
        description={
          pendingActive
            ? "The hold is recorded against this project and stays until it is removed. No automated deletion runs on this project today, so the hold documents intent rather than interrupting an active process."
            : "The hold is lifted and the configured retention values apply again as policy. No automated deletion job runs yet, so no records become eligible for removal as a result."
        }
        confirmLabel={pendingActive ? "Apply hold" : "Remove hold"}
        destructive={pendingActive}
        isPending={setLegalHold.isPending}
        onConfirm={handleConfirm}
        content={
          pendingActive ? (
            <div className="px-1 pb-2">
              <label htmlFor="hold-reason" className="text-sm font-medium">
                Reason (optional)
              </label>
              <Textarea
                id="hold-reason"
                className="mt-1.5"
                placeholder="Litigation reference, regulatory requirement…"
                value={holdReason}
                onChange={handleHoldReasonChange}
                rows={3}
              />
            </div>
          ) : undefined
        }
        keepOpenOnConfirm
      />
    </div>
  );
}
