"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SoLineItem {
  id: number;
  productId: number;
  productName: string | null;
  productSku: string | null;
  quantity: string | number;
  unitPrice: string | number;
  taxRate: string | number | null;
  discount?: string | number | null;
  lineTotal: string | number;
}

interface AtpEntry {
  productId: number;
  available: number;
  requested: number;
}

interface SoLineTableProps {
  lines: SoLineItem[];
  atpData?: AtpEntry[];
}

function formatNum(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(2);
}

function AtpStatusIndicator({ available, requested }: { available: number; requested: number }) {
  if (available >= requested) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-green-500 inline-block" />
        In stock
      </span>
    );
  }
  if (available > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-yellow-500 inline-block" />
        Partial ({available})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
      <span className="size-1.5 rounded-full bg-red-500 inline-block" />
      Insufficient
    </span>
  );
}

export function SoLineTable({ lines, atpData }: SoLineTableProps) {
  const showAtp = Boolean(atpData && atpData.length > 0);

  function getAtp(productId: number): AtpEntry | undefined {
    return atpData?.find((a) => a.productId === productId);
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Tax %</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showAtp && <TableHead>ATP Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const atp = getAtp(line.productId);
            return (
              <TableRow key={line.id}>
                <TableCell>{line.productName ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{line.productSku ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNum(line.quantity)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNum(line.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.taxRate ? `${formatNum(line.taxRate)}%` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNum(line.lineTotal)}</TableCell>
                {showAtp && (
                  <TableCell>
                    {atp ? (
                      <AtpStatusIndicator available={atp.available} requested={Number(line.quantity)} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
