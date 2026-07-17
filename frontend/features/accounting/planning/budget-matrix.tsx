"use client";

import { useState, useMemo, useEffect, type ChangeEvent } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReplaceBudgetLines } from "@/hooks/api/accounting/planning";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BudgetDetail } from "@/types/accounting/planning";
import { TruncatedText } from "@/components/ui/truncated-text";

interface BudgetMatrixProps {
  budget: BudgetDetail;
  readOnly?: boolean;
}

interface MatrixCellProps {
  accountId: number;
  periodKey: string;
  value: string;
  readOnly: boolean;
  onChange: (accountId: number, periodKey: string, value: string) => void;
}

function MatrixCell({ accountId, periodKey, value, readOnly, onChange }: MatrixCellProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    onChange(accountId, periodKey, e.target.value);
  }
  return (
    <input
      type="number"
      step="0.01"
      value={value}
      disabled={readOnly}
      onChange={handleChange}
      className="w-full min-w-[90px] text-right font-mono text-xs tabular-nums bg-transparent border-0 outline-none focus:bg-primary/5 px-2 py-1.5 rounded disabled:opacity-60 disabled:cursor-not-allowed"
    />
  );
}

function buildCells(lines: BudgetDetail["lines"]): Record<string, string> {
  const init: Record<string, string> = {};
  for (const line of lines) {
    init[`${line.accountId}:${line.periodKey}`] = line.amount;
  }
  return init;
}

function fmt(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BudgetMatrix({ budget, readOnly = false }: BudgetMatrixProps) {
  const [cells, setCells] = useState<Record<string, string>>(() => buildCells(budget.lines));
  const [note, setNote] = useState("");

  useEffect(() => {
    setCells(buildCells(budget.lines));
  }, [budget.lines]);

  const accounts = useMemo(() => {
    const seen = new Set<number>();
    const list: Array<{ accountId: number; accountCode: string; accountName: string }> = [];
    for (const line of budget.lines) {
      if (!seen.has(line.accountId)) {
        seen.add(line.accountId);
        list.push({ accountId: line.accountId, accountCode: line.accountCode, accountName: line.accountName });
      }
    }
    return list;
  }, [budget.lines]);

  const periods = useMemo(() => {
    const seen = new Set<string>();
    for (const line of budget.lines) seen.add(line.periodKey);
    return Array.from(seen).sort();
  }, [budget.lines]);

  const colTotals = useMemo(
    () =>
      periods.map((period) =>
        accounts.reduce(
          (sum, acc) => sum + parseFloat(cells[`${acc.accountId}:${period}`] ?? "0"),
          0,
        ),
      ),
    [periods, accounts, cells],
  );

  const grandTotal = useMemo(() => colTotals.reduce((s, t) => s + t, 0), [colTotals]);

  const replaceMutation = useReplaceBudgetLines(budget.id);

  function handleCellChange(accountId: number, periodKey: string, value: string) {
    setCells((prev) => ({ ...prev, [`${accountId}:${periodKey}`]: value }));
  }

  function handleNoteChange(e: ChangeEvent<HTMLInputElement>) {
    setNote(e.target.value);
  }

  function handleSave() {
    const lines = accounts
      .flatMap((acc) =>
        periods.map((period) => ({
          accountId: acc.accountId,
          periodKey: period,
          amount: parseFloat(cells[`${acc.accountId}:${period}`] ?? "0"),
        })),
      )
      .filter((l) => l.amount !== 0);

    replaceMutation.mutate(
      { lines, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Budget lines saved");
          setNote("");
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  if (accounts.length === 0 || periods.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No budget lines. Add accounts and periods to the budget first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="min-w-max w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-20 bg-muted/80">
              <th className="sticky left-0 z-30 bg-muted/80 min-w-[220px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground border border-border/40">
                Account
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="min-w-[110px] px-2 py-2 text-right text-xs font-semibold text-muted-foreground border border-border/40 whitespace-nowrap"
                >
                  {period}
                </th>
              ))}
              <th className="min-w-[110px] px-2 py-2 text-right text-xs font-semibold text-muted-foreground border border-border/40">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, rowIdx) => {
              const rowTotal = periods.reduce(
                (sum, period) => sum + parseFloat(cells[`${acc.accountId}:${period}`] ?? "0"),
                0,
              );
              return (
                <tr
                  key={acc.accountId}
                  className={rowIdx % 2 === 0 ? "bg-card" : "bg-muted/10"}
                >
                  <td className="sticky left-0 z-10 bg-inherit min-w-[220px] px-3 py-1.5 border border-border/40">
                    <div className="flex flex-col leading-tight">
                      <TruncatedText text={acc.accountName} className="text-xs font-medium max-w-[200px]" />
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {acc.accountCode}
                      </span>
                    </div>
                  </td>
                  {periods.map((period) => {
                    const cellKey = `${acc.accountId}:${period}`;
                    return (
                      <td key={period} className="border border-border/40 p-0">
                        <MatrixCell
                          accountId={acc.accountId}
                          periodKey={period}
                          value={cells[cellKey] ?? ""}
                          readOnly={readOnly}
                          onChange={handleCellChange}
                        />
                      </td>
                    );
                  })}
                  <td className="border border-border/40 px-2 py-1.5 text-right font-mono text-xs tabular-nums font-medium bg-muted/30 min-w-[110px]">
                    {fmt(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-medium">
              <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 text-xs font-semibold border border-border/40">
                Total
              </td>
              {colTotals.map((total, i) => (
                <td
                  key={periods[i]}
                  className="px-2 py-2 text-right font-mono text-xs tabular-nums font-semibold border border-border/40"
                >
                  {fmt(total)}
                </td>
              ))}
              <td className="px-2 py-2 text-right font-mono text-xs tabular-nums font-bold border border-border/40">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readOnly && (
        <div className="flex items-end gap-3 pt-1">
          <div className="flex flex-col gap-1 flex-1 max-w-sm">
            <Label htmlFor="budget-matrix-note" className="text-xs text-muted-foreground">
              Revision note (optional)
            </Label>
            <Input
              id="budget-matrix-note"
              value={note}
              onChange={handleNoteChange}
              placeholder="Describe this revision…"
              className="text-sm"
            />
          </div>
          <LoadingButton
            isPending={replaceMutation.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            size="sm"
          >
            Save Lines
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
