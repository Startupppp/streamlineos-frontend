"use client";

import { useCallback, useState } from "react";
import {
  Ban,
  Check,
  Download,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import type { Invoice, PatchableInvoiceStatus } from "@/types/invoice";

interface InvoiceDetailActionsProps {
  invoice: Invoice;
  outstanding: number;
  isUpdating: boolean;
  onEdit: () => void;
  onRecordPayment: () => void;
  onStatusUpdate: (status: PatchableInvoiceStatus) => void;
  onVoid: () => void;
  onDownload: () => void;
}

export function InvoiceDetailActions({
  invoice,
  outstanding,
  isUpdating,
  onEdit,
  onRecordPayment,
  onStatusUpdate,
  onVoid,
  onDownload,
}: InvoiceDetailActionsProps) {
  // Each key is the one its own route declares: PATCH /invoices/:id -> accounting:update,
  // POST /invoices/:id/payments -> accounting:create, POST /invoices/:id/void -> accounting:manage.
  const canUpdate = useCan("accounting:update");
  const canCreate = useCan("accounting:create");
  const canVoid = useCan("accounting:manage");
  const [voidOpen, setVoidOpen] = useState(false);

  const showRecordPayment =
    canCreate && (invoice.status === "ISSUED" || invoice.status === "FAILED");
  const showVoid = canVoid && invoice.status !== "VOIDED" && invoice.status !== "PAID";

  const handleMarkIssued = useCallback(() => onStatusUpdate("ISSUED"), [onStatusUpdate]);
  const handleMarkPaid = useCallback(() => onStatusUpdate("PAID"), [onStatusUpdate]);
  const handleRequestVoid = useCallback(() => setVoidOpen(true), []);
  const handleConfirmVoid = useCallback(() => onVoid(), [onVoid]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate && invoice.status === "DRAFT" && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
      )}
      {canUpdate && invoice.status === "DRAFT" && (
        <LoadingButton size="sm" variant="outline" onClick={handleMarkIssued} isPending={isUpdating}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Mark Issued
        </LoadingButton>
      )}
      {showRecordPayment && (
        <Button size="sm" variant="outline" onClick={onRecordPayment}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Payment
        </Button>
      )}
      {canUpdate && invoice.status === "ISSUED" && (
        <LoadingButton size="sm" variant="outline" onClick={handleMarkPaid} isPending={isUpdating}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Mark Paid
        </LoadingButton>
      )}
      {showVoid && (
        <>
          <LoadingButton size="sm" variant="outline" onClick={handleRequestVoid} isPending={isUpdating}>
            <Ban className="mr-1.5 h-3.5 w-3.5" /> Void
          </LoadingButton>
          <ConfirmDialog
            destructive
            keepOpenOnConfirm
            open={voidOpen}
            onOpenChange={setVoidOpen}
            isPending={isUpdating}
            title="Void this invoice?"
            description={`Voiding ${invoice.invoiceNumber} reverses its posted journal entry. Voiding cannot be undone — raise a fresh invoice instead.`}
            confirmLabel="Void invoice"
            onConfirm={handleConfirmVoid}
          />
        </>
      )}
      {invoice.status === "PAID" && outstanding <= 0 && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-status-success-ink">
          <Check className="h-4 w-4" /> Fully Paid
        </div>
      )}
      <Button size="sm" variant="outline" onClick={onDownload}>
        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
      </Button>
    </div>
  );
}
