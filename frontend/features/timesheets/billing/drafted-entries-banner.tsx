"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useUninvoicedEntries } from "@/hooks/api/timesheets/billing-invoice";
import { useReleaseInvoiceDraft } from "@/hooks/api/timesheets-core/billing";

interface DraftedEntriesBannerProps {
  startDate: string;
  endDate: string;
  projectId: number | null;
}

/**
 * Surfaces the stranded-record case named in the freelancer billing chain:
 * `createInvoiceDraft` (the "Export" flow) flips entries to `INVOICE_DRAFTED`
 * as a CSV/JSON snapshot, not a real invoice. Nothing else in this screen
 * ever showed that a drafted entry existed, so once created it sat invisible
 * and un-voidable (`voidEntry` refuses anything already drafted or invoiced)
 * until it happened to be picked up by a later "Create invoice draft" or
 * "Generate invoice" pass. This banner is the first place a stranded entry
 * becomes visible, and "Release" is the first way to un-stick it without
 * going through an invoice at all.
 */
export function DraftedEntriesBanner({ startDate, endDate, projectId }: DraftedEntriesBannerProps) {
  const canRelease = useCan("timesheets:billing:invoice");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const releaseDraft = useReleaseInvoiceDraft();

  const { data } = useUninvoicedEntries(
    { startDate, endDate, projectId: projectId ?? undefined },
    { enabled: canRelease },
  );

  const draftedIds = useMemo(
    () =>
      (data?.items ?? [])
        .filter((entry) => entry.invoicingStatus === "INVOICE_DRAFTED")
        .map((entry) => entry.id),
    [data?.items],
  );

  const handleOpen = useCallback(() => setConfirmOpen(true), []);

  const handleConfirm = useCallback(() => {
    releaseDraft.mutate(
      { timesheetEntryIds: draftedIds },
      { onSuccess: () => setConfirmOpen(false) },
    );
  }, [releaseDraft, draftedIds]);

  if (!canRelease || draftedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
        <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning-ink" />
        <span className="flex-1">
          {draftedIds.length} entr{draftedIds.length === 1 ? "y is" : "ies are"} drafted onto an
          export that never became an invoice, and can&apos;t be billed or voided until released.
        </span>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          Release
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Release drafted entries?"
        description={`${draftedIds.length} time entr${draftedIds.length === 1 ? "y" : "ies"} will go back to billable and can be added to a new invoice draft or invoice.`}
        confirmLabel="Release"
        onConfirm={handleConfirm}
        isPending={releaseDraft.isPending}
      />
    </>
  );
}
