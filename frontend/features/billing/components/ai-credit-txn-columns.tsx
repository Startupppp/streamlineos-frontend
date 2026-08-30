"use client";

import { type ReactNode } from "react";
import { addMonths, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { type DataTableColumn } from "@/components/ui/data-table";
import type { AiCreditTransaction } from "@/hooks/api/ai-credits";
import { formatCredits, formatTokens } from "@/lib/format-ai";

export const TXN_LABELS: Record<
  AiCreditTransaction["type"],
  { label: string; sign: string; color: string }
> = {
  PURCHASE: { label: "Purchase", sign: "+", color: "text-status-success-ink" },
  PLAN_GRANT: { label: "Plan Grant", sign: "+", color: "text-status-success-ink" },
  USAGE: { label: "Usage", sign: "-", color: "text-foreground" },
  REFUND: { label: "Refund", sign: "+", color: "text-status-info-ink" },
  EXPIRY: { label: "Expiry", sign: "-", color: "text-destructive" },
};

export const TXN_COLUMNS: DataTableColumn<AiCreditTransaction>[] = [
  {
    key: "type",
    header: "Type",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
      return <Badge variant="secondary" className="text-micro">{meta.label}</Badge>;
    },
  },
  {
    key: "feature",
    header: "Feature",
    cell: (txn): ReactNode => (
      <span className="text-xs text-muted-foreground">{txn.feature ?? "—"}</span>
    ),
  },
  {
    key: "model",
    header: "Model",
    cell: (txn): ReactNode =>
      txn.model ? (
        <TruncatedText text={txn.model} className="text-xs text-muted-foreground max-w-[120px]" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "totalTokens",
    header: "Tokens",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-xs",
    cell: (txn): ReactNode => {
      if (txn.totalTokens == null) return <span className="text-muted-foreground">—</span>;
      const title =
        txn.promptTokens != null && txn.completionTokens != null
          ? `In: ${txn.promptTokens.toLocaleString()}  Out: ${txn.completionTokens.toLocaleString()}`
          : undefined;
      return (
        <span className="text-muted-foreground" title={title}>
          {formatTokens(txn.totalTokens)}
        </span>
      );
    },
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    cell: (txn): ReactNode => {
      const meta = TXN_LABELS[txn.type] ?? { label: txn.type, sign: "", color: "text-foreground" };
      return (
        <span className={`font-mono text-sm font-medium tabular-nums ${meta.color}`}>
          {meta.sign}{formatCredits(Math.abs(txn.amount))}
        </span>
      );
    },
    className: "text-right",
  },
  {
    key: "balanceAfter",
    header: "Balance",
    headerClassName: "text-right",
    className: "text-right font-mono text-sm tabular-nums text-muted-foreground",
    cell: (txn): ReactNode => formatCredits(txn.balanceAfter),
  },
  {
    key: "expires",
    header: "Expires",
    headerClassName: "text-right",
    className: "text-right text-xs text-muted-foreground",
    cell: (txn): ReactNode =>
      txn.type === "PURCHASE"
        ? format(addMonths(new Date(txn.createdAt), 12), "dd MMM yyyy")
        : "—",
  },
  {
    key: "createdAt",
    header: "Date",
    headerClassName: "text-right",
    className: "text-right text-xs text-muted-foreground",
    cell: (txn): ReactNode => format(new Date(txn.createdAt), "dd MMM yyyy"),
  },
];

export function getTxnRowKey(txn: AiCreditTransaction): string | number {
  return txn.id;
}
