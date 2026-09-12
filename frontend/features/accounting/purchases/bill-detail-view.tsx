"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import type { PurchaseBill } from "@/types/accounting";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  isPurchaseBillStatus,
  formatDate,
  formatNum,
  ITEM_COLUMNS,
  PAYMENT_COLUMNS,
} from "./bill-detail-columns";

interface BillDetailViewProps {
  bill: PurchaseBill;
  outstanding: number;
  isPendingApproval: boolean;
  canApprove: boolean;
  canManage: boolean;
  isApprovePending: boolean;
  isCancelPending: boolean;
  onApprove: () => void;
  onOpenCancelDialog: () => void;
}

export function BillDetailView({
  bill,
  outstanding,
  isPendingApproval,
  canApprove,
  canManage,
  isApprovePending,
  isCancelPending,
  onApprove,
  onOpenCancelDialog,
}: BillDetailViewProps) {
  return (
    <div className="space-y-4">
      {isPendingApproval && (
        <div className="rounded-lg border border-status-info-rule bg-status-info-surface p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-status-info-ink">Pending approval</p>
            <p className="text-xs text-status-info-ink mt-0.5">
              This bill is awaiting approval before it can be posted.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {canApprove && (
              <LoadingButton
                size="sm"
                isPending={isApprovePending}
                loadingText="Approving…"
                onClick={onApprove}
              >
                Approve
              </LoadingButton>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCancelDialog}
                disabled={isCancelPending}
              >
                Cancel bill
              </Button>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Status</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${isPurchaseBillStatus(bill.status) ? STATUS_CLASS[bill.status] : "bg-muted text-muted-foreground border-border"}`}
              >
                {isPurchaseBillStatus(bill.status) ? STATUS_LABEL[bill.status] : bill.status}
              </span>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Vendor</p>
              <p className="text-sm text-foreground">{bill.vendorName ?? "—"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Vendor bill #</p>
              <p className="text-sm text-foreground">{bill.vendorBillNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Bill date</p>
              <p className="text-sm tabular-nums text-foreground">{formatDate(bill.billDate)}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Due date</p>
              <p className="text-sm tabular-nums text-foreground">{formatDate(bill.dueDate)}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Place of supply</p>
              <p className="text-sm text-foreground">{bill.placeOfSupply ?? "—"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Vendor GSTIN</p>
              <p className="text-sm font-mono text-foreground">{bill.vendorGstin ?? "—"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Supplier GSTIN</p>
              <p className="text-sm font-mono text-foreground">{bill.supplierGstin ?? "—"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Reverse charge</p>
              <p className="text-sm text-foreground">{bill.reverseCharge ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-dense font-medium text-muted-foreground mb-1">Expense account</p>
              <p className="text-sm font-mono text-foreground">{bill.expenseAccountCode ?? "—"}</p>
            </div>
            {bill.notes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-dense font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{bill.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={bill.items}
        columns={ITEM_COLUMNS}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState title="No line items" compact />
        }
        minWidth="760px"
      />

      <div className="flex justify-end">
        <Card className="w-full max-w-sm">
          <CardContent className="p-4 space-y-1.5 text-sm tabular-nums">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatNum(bill.subtotal)}</span>
            </div>
            {Number(bill.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>−{formatNum(bill.discount)}</span>
              </div>
            )}
            {Number(bill.cgstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatNum(bill.cgstAmount)}</span>
              </div>
            )}
            {Number(bill.sgstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatNum(bill.sgstAmount)}</span>
              </div>
            )}
            {Number(bill.igstAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatNum(bill.igstAmount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-1.5 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>{formatNum(bill.total)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Amount paid</span>
              <span>{formatNum(bill.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Outstanding</span>
              <span className={outstanding > 0.005 ? "text-status-warning-ink" : "text-status-success-ink"}>
                {formatNum(outstanding)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {bill.payments && bill.payments.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Payments</h2>
          <DataTable
            data={bill.payments}
            columns={PAYMENT_COLUMNS}
            getRowKey={(row) => row.id}
          />
        </div>
      )}
    </div>
  );
}
