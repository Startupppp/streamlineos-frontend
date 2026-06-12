"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CreditCard, Send } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { usePurchaseBill, usePostPurchaseBill } from "@/lib/api/hooks/accounting";
import { RecordVendorPaymentDialog } from "@/features/accounting/record-vendor-payment-dialog";
import type { PurchaseBillStatus } from "@/types/accounting";

interface PurchaseBillDetailPageProps {
  params: Promise<{ billId: string }>;
}

const STATUS_VARIANT: Record<PurchaseBillStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  POSTED: "default",
  PARTIALLY_PAID: "outline",
  PAID: "default",
  CANCELLED: "destructive",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatAmount(value: string): string {
  return Number(value).toFixed(2);
}

export default function PurchaseBillDetailPage({ params }: PurchaseBillDetailPageProps) {
  const { billId } = use(params);
  const id = Number(billId);
  const query = usePurchaseBill(id);
  const postMutation = usePostPurchaseBill(id);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const bill = query.data;

  function handlePost(): void {
    postMutation.mutate(undefined, {
      onSuccess: () => toast.success(`Bill ${bill?.billNumber ?? ""} posted`),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleOpenPaymentDialog(): void {
    setPaymentDialogOpen(true);
  }

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={query.error.message} />;
  if (!bill) return <ErrorState title="Not found" description={`Bill #${billId}`} />;

  const canPost = bill.status === "DRAFT";
  const outstanding = Number(bill.total) - Number(bill.amountPaid);
  const canRecordPayment = (bill.status === "POSTED" || bill.status === "PARTIALLY_PAID") && outstanding > 0.005;

  return (
    <PageWrapper
      eyebrow="Accounting · Purchase Bill"
      title={bill.billNumber}
      subtitle={`${bill.vendorName ?? "Unknown vendor"} · ${formatDate(bill.billDate)}`}
      actions={
        <div className="flex items-center gap-2">
          {canPost && (
            <Button size="sm" onClick={handlePost} disabled={postMutation.isPending}>
              <Send className="mr-1 h-4 w-4" />
              {postMutation.isPending ? "Posting…" : "Post bill"}
            </Button>
          )}
          {canRecordPayment && (
            <Button size="sm" variant="outline" onClick={handleOpenPaymentDialog}>
              <CreditCard className="mr-1 h-4 w-4" />
              Record payment
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/purchase-bills">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd><Badge variant={STATUS_VARIANT[bill.status]}>{bill.status}</Badge></dd>
            <dt className="text-muted-foreground">Vendor</dt>
            <dd>{bill.vendorName ?? "—"}</dd>
            <dt className="text-muted-foreground">Vendor bill #</dt>
            <dd>{bill.vendorBillNumber ?? "—"}</dd>
            <dt className="text-muted-foreground">Due date</dt>
            <dd>{formatDate(bill.dueDate)}</dd>
            <dt className="text-muted-foreground">Place of supply</dt>
            <dd>{bill.placeOfSupply ?? "—"}</dd>
            <dt className="text-muted-foreground">Vendor GSTIN</dt>
            <dd>{bill.vendorGstin ?? "—"}</dd>
            <dt className="text-muted-foreground">Reverse charge</dt>
            <dd>{bill.reverseCharge ? "Yes" : "No"}</dd>
            <dt className="text-muted-foreground">Expense account</dt>
            <dd>{bill.expenseAccountCode ?? "—"}</dd>
            {bill.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="col-span-3">{bill.notes}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>GST %</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.hsnSacCode ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(it.quantity)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(it.rate)}</TableCell>
                  <TableCell>{formatAmount(it.gstRate)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(it.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm tabular-nums">
            <div></div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatAmount(bill.subtotal)}</span></div>
              {Number(bill.discount) > 0 && (
                <div className="flex justify-between"><span>Discount</span><span>−{formatAmount(bill.discount)}</span></div>
              )}
              {Number(bill.cgstAmount) > 0 && (
                <div className="flex justify-between"><span>CGST</span><span>{formatAmount(bill.cgstAmount)}</span></div>
              )}
              {Number(bill.sgstAmount) > 0 && (
                <div className="flex justify-between"><span>SGST</span><span>{formatAmount(bill.sgstAmount)}</span></div>
              )}
              {Number(bill.igstAmount) > 0 && (
                <div className="flex justify-between"><span>IGST</span><span>{formatAmount(bill.igstAmount)}</span></div>
              )}
              <div className="border-t border-slate-200/60 pt-1 flex justify-between font-medium text-base">
                <span>Total</span><span>{formatAmount(bill.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Amount paid</span><span>{formatAmount(bill.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Outstanding</span><span>{(Number(bill.total) - Number(bill.amountPaid)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <RecordVendorPaymentDialog
        billId={id}
        billNumber={bill.billNumber}
        remaining={outstanding}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
      />
    </PageWrapper>
  );
}
