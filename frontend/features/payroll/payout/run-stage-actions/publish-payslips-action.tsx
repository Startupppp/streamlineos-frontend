"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCan } from "@/hooks/api/access";
import { usePublishPayslips, useRunEmployees } from "@/hooks/api/payroll";
import { useRunConflictHandler } from "@/features/payroll/shared/run-conflict";

const HOLD_SCAN_LIMIT = 100;

function payslips(n: number): string {
  return `${n} payslip${n === 1 ? "" : "s"}`;
}

interface Props {
  runId: number;
  status: string;
}

export function PublishPayslipsAction({ runId, status }: Props) {
  const canManage = useCan("payroll:payslips:manage");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = usePublishPayslips();
  const handleError = useRunConflictHandler(runId);
  const { data: roster } = useRunEmployees(status === "PAID" ? runId : 0, { limit: HOLD_SCAN_LIMIT });
  const counts =
    roster && !roster.pagination.hasMore
      ? { total: roster.data.length, held: roster.data.filter((row) => row.holdReason !== null).length }
      : null;
  const releaseLabel = counts
    ? `Release ${payslips(counts.total - counts.held)}${counts.held > 0 ? ` · ${counts.held} on hold` : ""}`
    : "Release payslips";

  if (status !== "PAID") return null;
  if (!canManage) return null;

  function handleOpen() {
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleConfirm() {
    mutate(
      { runId },
      {
        onSuccess: (data) => {
          setOpen(false);
          const onHold = data.heldCount > 0 ? ` ${data.heldCount} on hold.` : "";
          if (data.published < data.total) {
            toast.warning(`Released ${data.published} of ${payslips(data.total)}.${onHold}`, {
              description:
                "The remaining payslips failed. Open the Payslips tab to see which employees failed and retry them.",
            });
            return;
          }
          toast.success(`Released ${payslips(data.published)}.${onHold}`);
          if (data.runStatus === "PAYSLIPS_PUBLISHED") {
            toast.success("Run status updated to Payslips Published");
          }
        },
        onError: handleError,
      },
    );
  }

  return (
    <>
      <Button size="sm" className="h-9" onClick={handleOpen}>
        <FileCheck className="mr-2 h-4 w-4" />
        {releaseLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release payslips</DialogTitle>
            <DialogDescription>
              Payslips will be published and made available to employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-sm font-medium">{releaseLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Employees on hold do not receive a payslip until you release their hold.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <LoadingButton onClick={handleConfirm} isPending={isPending} loadingText="Releasing…">
              Release
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
