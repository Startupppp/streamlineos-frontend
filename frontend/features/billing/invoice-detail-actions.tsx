import {
  Ban,
  Check,
  Download,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
  const canRecordPayment = invoice.status === "ISSUED" || invoice.status === "FAILED";
  const canVoid = invoice.status !== "VOIDED" && invoice.status !== "PAID";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {invoice.status === "DRAFT" && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
      )}
      {invoice.status === "DRAFT" && (
        <LoadingButton size="sm" variant="outline" onClick={() => onStatusUpdate("ISSUED")} isPending={isUpdating}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Mark Issued
        </LoadingButton>
      )}
      {canRecordPayment && (
        <Button size="sm" variant="outline" onClick={onRecordPayment}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Payment
        </Button>
      )}
      {invoice.status === "ISSUED" && (
        <LoadingButton size="sm" variant="outline" onClick={() => onStatusUpdate("PAID")} isPending={isUpdating}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> Mark Paid
        </LoadingButton>
      )}
      {canVoid && (
        <LoadingButton size="sm" variant="outline" onClick={onVoid} isPending={isUpdating}>
          <Ban className="mr-1.5 h-3.5 w-3.5" /> Void
        </LoadingButton>
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
