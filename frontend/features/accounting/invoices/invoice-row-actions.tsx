"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { useVoidInvoice } from "@/hooks/api/accounting/ar";
import { useCan } from "@/hooks/api/access";
import type { Invoice } from "@/types/invoice";

interface InvoiceRowActionsProps {
  invoice: Invoice;
  onRecordPayment: (invoice: Invoice) => void;
}

export function InvoiceRowActions({ invoice, onRecordPayment }: InvoiceRowActionsProps) {
  const router = useRouter();
  const voidMutation = useVoidInvoice();
  // The key `POST /invoices/{invoiceId}/void` declares and `useVoidInvoice` carries.
  const canManage = useCan("accounting:manage");
  const amountPaid = Number(invoice.amountPaid ?? "0");

  function handleViewDetail(): void {
    router.push(`/accounting/invoices/${invoice.id}`);
  }

  function handleRecordPayment(): void {
    onRecordPayment(invoice);
  }

  function handleVoid(): void {
    voidMutation.mutate(
      { invoiceId: invoice.id },
      {
        onSuccess: () => toast.success("Invoice voided"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} variant="ghost" size="icon" className="w-7" aria-label="Actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleViewDetail}>View Detail</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleRecordPayment}>Record Payment</DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  disabled={amountPaid > 0}
                  className="text-destructive focus:text-destructive"
                >
                  Void Invoice
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This will void invoice {invoice.invoiceNumber}. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleVoid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Void
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
