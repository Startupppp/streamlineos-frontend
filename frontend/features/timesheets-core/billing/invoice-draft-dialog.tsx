"use client";

import { useCallback } from "react";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCreateInvoiceDraft } from "@/hooks/api/timesheets-core/billing";
import type { BillingGroup } from "@/features/timesheets-core/types";

interface InvoiceDraftDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startDate: string;
  endDate: string;
  projectId: number | null;
  groups: BillingGroup[];
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceDraftDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  projectId,
  groups,
}: InvoiceDraftDialogProps) {
  const createDraft = useCreateInvoiceDraft();

  const hasMissingRates = groups.some((g) => g.missingRate);
  const totalHours = groups.reduce((sum, g) => sum + g.totalHours, 0);
  const totalAmount = groups.reduce((sum, g) => sum + g.billableAmount, 0);
  const totalEntries = groups.reduce((sum, g) => sum + g.entryCount, 0);
  const currency = groups[0]?.currency ?? "USD";

  const handleConfirm = useCallback(() => {
    createDraft.mutate(
      { startDate, endDate, projectId: projectId ?? undefined },
      { onSuccess: () => onOpenChange(false) },
    );
  }, [createDraft, startDate, endDate, projectId, onOpenChange]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Invoice Draft</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {hasMissingRates ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                One or more projects are missing bill rates. Set rates in{" "}
                <a href="/timesheets/settings/rates" className="underline font-medium">
                  Settings → Rates
                </a>{" "}
                before creating a draft.
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Entries</span>
                <span className="font-medium tabular-nums">{totalEntries}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total hours</span>
                <span className="font-mono font-medium tabular-nums">{totalHours.toFixed(1)} h</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                <span className="text-muted-foreground font-medium">Total amount</span>
                <span className="font-mono font-semibold tabular-nums">{formatMoney(totalAmount, currency)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleConfirm}
            disabled={hasMissingRates || createDraft.isPending}
          >
            {createDraft.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
