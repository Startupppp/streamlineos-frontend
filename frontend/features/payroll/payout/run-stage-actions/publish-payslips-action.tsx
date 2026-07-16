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
import { usePublishPayslips } from "@/hooks/api/payroll";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PublishResult } from "@/types/payroll";

interface Props {
  runId: number;
  status: string;
  onChanged?: () => void;
}

export function PublishPayslipsAction({ runId, status, onChanged }: Props) {
  const canManage = useCan("payroll:payslips:manage");
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = usePublishPayslips();

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
        onSuccess: (data: PublishResult) => {
          setOpen(false);
          toast.success(`Published ${data.published} of ${data.total} payslip(s)`);
          if (data.runStatus === "PAYSLIPS_PUBLISHED") {
            toast.success("Run status updated to Payslips Published");
          }
          onChanged?.();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <>
      <Button size="sm" className="h-9" onClick={handleOpen}>
        <FileCheck className="mr-2 h-4 w-4" />
        Publish Payslips
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Payslips</DialogTitle>
            <DialogDescription>
              Payslips will be published and made available to employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-md bg-muted/50 border border-border p-3">
              <p className="text-sm font-medium">Publish for all employees</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All employees in this run will receive their payslip.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
