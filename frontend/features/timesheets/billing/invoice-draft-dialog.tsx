"use client";

import { useCallback, useMemo } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCreateInvoiceDraft } from "@/hooks/api/timesheets-core/billing";
import { AiActionsMenu, type AiAction } from "@/components/ai/ai-actions-menu";
import { generateBillingNarrative } from "@/hooks/api/timesheets-core/ai";
import { useCan } from "@/hooks/api/access";
import { formatMoney } from "./lib/format-money";
import type { BillingGroup } from "@/features/timesheets/types";

interface InvoiceDraftDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startDate: string;
  endDate: string;
  projectId: number | null;
  groups: BillingGroup[];
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

  const canViewBilling = useCan("timesheets:billing:view");
  const narrativeActions = useMemo<AiAction[]>(
    () => [
      {
        key: "invoice-narrative",
        label: "Generate invoice narrative",
        description: "Draft a client-facing summary of the billable work",
        surface: "sheet",
        disabledReason: groups.length === 0 ? "No billable work in range" : undefined,
        run: async () => {
          const res = await generateBillingNarrative({
            projectId: projectId ?? undefined,
            startDate,
            endDate,
          });
          return { text: res.text, aiUsage: res.aiUsage };
        },
      },
    ],
    [groups.length, projectId, startDate, endDate],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Create Invoice Draft</DialogTitle>
            {canViewBilling ? (
              <AiActionsMenu
                actions={narrativeActions}
                triggerLabel="Narrative"
                menuLabel="AI assist"
                align="end"
              />
            ) : null}
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {hasMissingRates ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton
            className="gap-1.5"
            onClick={handleConfirm}
            isPending={createDraft.isPending}
            loadingText="Creating…"
            disabled={hasMissingRates || createDraft.isPending}
          >
            <FileText className="h-3.5 w-3.5" />
            Create draft
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
