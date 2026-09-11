"use client";

import { useState, useRef, memo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { CycleCountLine } from "@/hooks/api/inventory/counts";

function VarianceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  if (value === 0) return <span className="tabular-nums">0</span>;
  if (value > 0) return <span className="tabular-nums text-status-success-ink">+{value}</span>;
  return <span className="tabular-nums text-status-danger-ink">{value}</span>;
}

const DebouncedQtyInput = memo(function DebouncedQtyInput({
  lineId,
  initial,
  onSave,
}: {
  lineId: number;
  initial: number | null;
  onSave: (lineId: number, qty: number) => void;
}) {
  const [value, setValue] = useState(initial !== null ? String(initial) : "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function clearPendingTimerOnUnmount() {
    return function cleanup() {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value;
    setValue(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    const num = Number(raw);
    if (raw !== "" && Number.isFinite(num) && num >= 0) {
      timerRef.current = setTimeout(() => {
        onSave(lineId, num);
      }, 300);
    }
  }

  return (
    <Input
      type="number"
      min={0}
      value={value}
      onChange={handleChange}
      className="w-24 text-xs tabular-nums"
    />
  );
});

interface CountLineColumnsOptions {
  isCounting: boolean;
  isReview: boolean;
  onSaveLine: (lineId: number, qty: number) => void;
  scannedTally: Record<number, number>;
}

export function buildCountLineColumns({
  isCounting,
  isReview,
  onSaveLine,
  scannedTally,
}: CountLineColumnsOptions): DataTableColumn<CycleCountLine>[] {
  return [
    {
      key: "product",
      header: "Product",
      cell: (row) => (
        <TruncatedText text={row.productName} className="text-sm font-medium text-foreground" />
      ),
    },
    {
      key: "sku",
      header: "SKU",
      headerClassName: "w-[130px]",
      className: "font-mono text-xs text-muted-foreground",
      cell: (row) => row.variantSku,
    },
    {
      key: "location",
      header: "Location",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground",
      cell: (row) => <TruncatedText text={row.locationName ?? "—"} className="text-sm text-muted-foreground" />,
    },
    {
      key: "systemQty",
      header: "System Qty",
      headerClassName: "w-[100px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (row) => row.systemQty,
    },
    {
      key: "countedQty",
      header: "Counted Qty",
      headerClassName: "w-[130px] text-right",
      className: "text-right",
      cell: (row) =>
        isCounting ? (
          <div className="flex justify-end">
            {/*
             * Keyed on the scan tally, not on `countedQty`. The field seeds
             * itself from `initial` on mount, so a scanned count would
             * otherwise never reach a row somebody had already opened —
             * while keying on the server value would remount it mid-type,
             * 300ms after every keystroke, and steal the caret.
             */}
            <DebouncedQtyInput
              key={`${row.id}:${scannedTally[row.id] ?? 0}`}
              lineId={row.id}
              initial={scannedTally[row.id] ?? row.countedQty}
              onSave={onSaveLine}
            />
          </div>
        ) : (
          <span className="tabular-nums">
            {row.countedQty !== null ? row.countedQty : "—"}
          </span>
        ),
    },
    {
      key: "variance",
      header: "Variance",
      headerClassName: "w-[100px] text-right",
      className: "text-right",
      cell: (row) =>
        isReview ? (
          <VarianceCell value={row.variance} />
        ) : (
          <span className="text-muted-foreground tabular-nums">—</span>
        ),
    },
  ];
}
