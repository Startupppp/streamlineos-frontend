import {
  Ban,
  Check,
  Download,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Invoice, InvoiceStatus } from "@/types/invoice";

interface InvoiceDetailActionsProps {
  invoice: Invoice;
  outstanding: number;
  isUpdating: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onRecordPayment: () => void;
  onStatusUpdate: (status: InvoiceStatus) => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function InvoiceDetailActions({
  invoice,
  outstanding,
  isUpdating,
  isDeleting,
  onEdit,
  onRecordPayment,
  onStatusUpdate,
  onDownload,
  onDelete,
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
        <LoadingButton size="sm" variant="outline" onClick={() => onStatusUpdate("VOIDED")} isPending={isUpdating}>
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <LoadingButton
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            isPending={isDeleting}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </LoadingButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice <span className="font-mono font-medium">{invoice.invoiceNumber}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
