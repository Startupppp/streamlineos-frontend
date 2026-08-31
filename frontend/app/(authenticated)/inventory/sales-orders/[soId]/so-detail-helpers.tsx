"use client";

import { Check } from "lucide-react";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { SoStatus } from "@/features/inventory/lib";
import type { AtpEntry } from "@/hooks/api/inventory/sales-orders";

export type { SoStatus };

export const STEP_LABELS = ["Draft", "Confirmed", "Reserved", "Picked", "Packed", "Shipped", "Invoiced"];

export const STATUS_STEP: Record<SoStatus, number> = {
  DRAFT: 0, CONFIRMED: 1, PARTIALLY_RESERVED: 2, RESERVED: 2,
  PICKED: 3, PACKED: 4, PARTIALLY_SHIPPED: 5, SHIPPED: 5,
  INVOICED: 6, CLOSED: 6, CANCELLED: -1,
};

type StepState = "completed" | "active" | "future";

const STEP_CLS: Record<StepState, string> = {
  completed: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  active: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule font-medium",
  future: "bg-muted text-muted-foreground border-border",
};

export function FulfillmentStepper({ status }: { status: SoStatus }) {
  if (status === "CANCELLED")
    return (
      <span className="text-micro px-2 py-0.5 rounded border bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
        Cancelled
      </span>
    );
  const active = STATUS_STEP[status];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEP_LABELS.map((label, idx) => {
        const state: StepState = idx < active ? "completed" : idx === active ? "active" : "future";
        return (
          <span
            key={label}
            className={`text-micro px-2 py-0.5 rounded border inline-flex items-center gap-1 ${STEP_CLS[state]}`}
          >
            {state === "completed" && <Check className="size-2.5" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function AtpIndicator({ available, requested }: { available: number; requested: number }) {
  if (available >= requested)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success-ink bg-status-success-surface border border-status-success-rule rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-status-success-fill inline-block" />
        In stock
      </span>
    );
  if (available > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-warning-ink bg-status-warning-surface border border-status-warning-rule rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-status-warning-fill inline-block" />
        Partial ({available})
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-danger-ink bg-status-danger-surface border border-status-danger-rule rounded px-1.5 py-0.5">
      <span className="size-1.5 rounded-full bg-status-danger-fill inline-block" />
      Insufficient
    </span>
  );
}

export function formatNum(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(2);
}

export type SoLine = {
  id: number;
  productId: number;
  productName?: string | null;
  productSku?: string | null;
  quantity: string | number;
  unitPrice?: string | number | null;
  taxRate?: string | number | null;
  discount?: string | number | null;
  lineTotal?: string | number | null;
};

export function buildSoLineColumns(atpData: AtpEntry[]): DataTableColumn<SoLine>[] {
  return [
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span>{row.productName ?? "—"}</span>,
    },
    {
      key: "productSku",
      header: "SKU",
      className: "font-mono",
      cell: (row) => <span>{row.productSku ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.quantity)}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.unitPrice)}</span>,
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.taxRate ? `${formatNum(row.taxRate)}%` : "—"}</span>,
    },
    {
      key: "discount",
      header: "Disc %",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.discount ? `${formatNum(row.discount)}%` : "—"}</span>,
    },
    {
      key: "lineTotal",
      header: "Line Total",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.lineTotal)}</span>,
    },
    {
      key: "atp",
      header: "ATP",
      cell: (row) => {
        const atp = atpData.find((a) => a.productId === row.productId);
        return atp ? (
          <AtpIndicator available={atp.available} requested={Number(row.quantity)} />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];
}

