"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PaymentRunItem, PaymentRunItemStatus } from "@/hooks/api/accounting/ap";
import { useUpdatePaymentRunItem } from "@/hooks/api/accounting/ap";
import { formatShortDate } from "@/lib/date-utils";

function ItemStatusBadge({ status }: { status: PaymentRunItemStatus }) {
  const classes: Record<PaymentRunItemStatus, string> = {
    PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    PAID: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    SKIPPED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  };
  return (
    <Badge variant="outline" className={`text-micro px-1.5 py-0 h-4 ${classes[status]}`}>
      {status}
    </Badge>
  );
}

function ItemAmountCell({
  item,
  runId,
  isDraft,
}: {
  item: PaymentRunItem;
  runId: number;
  isDraft: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editValue, setEditValue] = useState(
    String(Number(item.amount).toFixed(2)),
  );
  const updateMutation = useUpdatePaymentRunItem(runId, item.id);

  function handleSave(): void {
    const amount = Number(editValue);
    if (!Number.isFinite(amount) || amount <= 0) return;
    updateMutation.mutate(
      { amount },
      {
        onSuccess: () => {
          setPopoverOpen(false);
          toast.success("Amount updated");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleExclude(): void {
    updateMutation.mutate(
      { excluded: true },
      {
        onSuccess: () => {
          setPopoverOpen(false);
          toast.success("Item excluded");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleEditValueChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setEditValue(e.target.value);
  }

  if (!isDraft) return <Money value={Number(item.amount)} />;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono h-7 px-2 hover:bg-muted"
        >
          <Money value={Number(item.amount)} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3 space-y-2">
        <Input
          value={editValue}
          onChange={handleEditValueChange}
          className="text-sm"
          type="number"
          step="0.01"
          min="0.01"
        />
        <div className="flex gap-2">
          <LoadingButton
            size="sm"
            className="flex-1"
            isPending={updateMutation.isPending}
            onClick={handleSave}
          >
            Save
          </LoadingButton>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExclude}
            disabled={updateMutation.isPending}
          >
            Exclude
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function buildPaymentRunItemColumns(id: number, isDraft: boolean): DataTableColumn<PaymentRunItem>[] {
  return [
    {
      key: "vendor",
      header: "Vendor",
      cell: (item) => (
        <span className="text-sm">{item.vendorName ?? "—"}</span>
      ),
    },
    {
      key: "bill",
      header: "Bill #",
      cell: (item) => (
        <Link
          href={`/accounting/purchase-bills/${item.billId}`}
          className="font-mono text-xs text-foreground hover:text-primary hover:underline"
        >
          {item.billNumber ?? "—"}
        </Link>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (item) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatShortDate(item.dueDate) || "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right",
      cell: (item) => (
        <ItemAmountCell item={item} runId={id} isDraft={isDraft} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <ItemStatusBadge status={item.status} />,
    },
  ];
}
