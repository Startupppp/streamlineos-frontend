"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JournalLine } from "@/types/accounting";

function parseAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface JournalLinesTableProps {
  lines: JournalLine[];
  debitTotal: number;
  creditTotal: number;
  isBalanced: boolean;
}

export function JournalLinesTable({ lines, debitTotal, creditTotal, isBalanced }: JournalLinesTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-10">
              #
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">
              Code
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
              Account name
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] text-right">
              Debit
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px] text-right">
              Credit
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
              Description
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={line.id} className="border-b border-border/50 hover:bg-muted/30">
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {index + 1}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {line.accountCode}
              </TableCell>
              <TableCell className="text-sm text-foreground">{line.accountName}</TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums text-destructive">
                {parseAmount(line.debit) > 0 ? formatAmount(parseAmount(line.debit)) : ""}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums text-emerald-600">
                {parseAmount(line.credit) > 0
                  ? formatAmount(parseAmount(line.credit))
                  : ""}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {line.description ?? ""}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/40 hover:bg-muted/40 border-t border-border">
            <TableCell />
            <TableCell />
            <TableCell className="font-medium text-foreground text-sm">Total</TableCell>
            <TableCell className="text-right font-mono font-medium tabular-nums text-foreground text-sm">
              {formatAmount(debitTotal)}
            </TableCell>
            <TableCell className="text-right font-mono font-medium tabular-nums text-foreground text-sm">
              {formatAmount(creditTotal)}
            </TableCell>
            <TableCell>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Unbalanced
                </span>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
