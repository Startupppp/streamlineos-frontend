"use client";

import { useState, useCallback } from "react";
import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinanceStatusBadge, Money } from "@/features/accounting/shared";
import { getUserDisplayName } from "@/lib/person-display";
import type { FinReceiptInboxItem } from "@/types/accounting/expenses";
import { ReceiptEditSheet } from "./receipt-edit-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FLAG_LABELS: Record<string, string> = {
  OVER_LIMIT: "Exceeds policy limit",
  RECEIPT_REQUIRED: "Receipt required per policy",
};

interface ReceiptCardProps {
  item: FinReceiptInboxItem;
}

export function ReceiptCard({ item }: ReceiptCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <TruncatedText text={item.merchant ?? item.category} className="text-sm font-medium" />
          <p className="text-xs text-muted-foreground">
            {getUserDisplayName(item.user)} · {formatDate(item.expenseDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Money value={parseFloat(item.amount)} className="text-sm font-semibold" />
          <FinanceStatusBadge status="SUBMITTED" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 dark:bg-amber-500/10 dark:border-amber-500/30">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            {FLAG_LABELS[item.policyFlag] ?? item.policyFlag}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-xs gap-1"
          onClick={handleOpenEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit metadata
        </Button>
      </div>

      <ReceiptEditSheet expense={item} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
