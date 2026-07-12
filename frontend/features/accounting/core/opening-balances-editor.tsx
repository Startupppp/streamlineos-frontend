"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/api/accounting";
import { usePostOpeningBalances } from "@/hooks/api/accounting/core";

interface EditorLine {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
}

function makeEmptyLine(): EditorLine {
  return { id: crypto.randomUUID(), accountId: "", debit: "", credit: "" };
}

function parseMoney(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatMoney(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface OpeningBalancesEditorProps {
  onSuccess: () => void;
}

export function OpeningBalancesEditor({ onSuccess }: OpeningBalancesEditorProps) {
  const [asOfDate, setAsOfDate] = useState<string>("");
  const [lines, setLines] = useState<EditorLine[]>([makeEmptyLine(), makeEmptyLine()]);

  const accountsQuery = useAccounts({ activeOnly: true, pageSize: 500 });
  const accounts = accountsQuery.data?.items ?? [];

  const postMutation = usePostOpeningBalances();

  const totalDebit = lines.reduce((sum, l) => sum + parseMoney(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseMoney(l.credit), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.005;

  function handleAddLine(): void {
    setLines((prev) => [...prev, makeEmptyLine()]);
  }

  function handleRemoveLine(id: string): void {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleAccountChange(id: string, value: string): void {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, accountId: value } : l)));
  }

  function handleDebitChange(id: string, value: string): void {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, debit: value, credit: value ? "" : l.credit } : l)),
    );
  }

  function handleCreditChange(id: string, value: string): void {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, credit: value, debit: value ? "" : l.debit } : l)),
    );
  }

  function handleDateChange(value: string): void {
    setAsOfDate(value);
  }

  function handleSubmit(): void {
    if (!asOfDate) {
      toast.error("Select an as-of date");
      return;
    }
    const validLines = lines.filter(
      (l) => l.accountId && (parseMoney(l.debit) > 0 || parseMoney(l.credit) > 0),
    );
    if (validLines.length < 1) {
      toast.error("Add at least one line with an account and amount");
      return;
    }
    const payload = validLines.map((l) => {
      const accountId = parseInt(l.accountId, 10);
      const debit = parseMoney(l.debit);
      const credit = parseMoney(l.credit);
      return debit > 0 ? { accountId, debit } : { accountId, credit };
    });
    postMutation.mutate(
      { asOfDate, lines: payload },
      {
        onSuccess: () => {
          toast.success("Opening balances posted");
          onSuccess();
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="ob-asof" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          As of date
        </label>
        <DatePicker
          id="ob-asof"
          value={asOfDate}
          onChange={handleDateChange}
          placeholder="Pick a date"
          className="h-8 text-xs w-[180px]"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                Account
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px]">
                Debit
              </th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px]">
                Credit
              </th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-border/50">
                <td className="px-2 py-1.5">
                  <Select
                    value={line.accountId}
                    onValueChange={(v) => handleAccountChange(line.id, v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Select account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-7 text-xs text-right font-mono"
                    placeholder="0.00"
                    value={line.debit}
                    onChange={(e) => handleDebitChange(line.id, e.target.value)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-7 text-xs text-right font-mono"
                    placeholder="0.00"
                    value={line.credit}
                    onChange={(e) => handleCreditChange(line.id, e.target.value)}
                  />
                </td>
                <td className="px-1 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveLine(line.id)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 border-t border-border">
              <td className="px-3 py-2 text-xs font-semibold text-foreground">Totals</td>
              <td className="px-3 py-2 text-xs font-mono text-right font-semibold tabular-nums">
                {formatMoney(totalDebit)}
              </td>
              <td className="px-3 py-2 text-xs font-mono text-right font-semibold tabular-nums">
                {formatMoney(totalCredit)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {!isBalanced && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Difference: {formatMoney(difference)} — this amount will be auto-posted to Retained Earnings
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleAddLine} type="button">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add row
        </Button>
        <LoadingButton
          size="sm"
          isPending={postMutation.isPending}
          loadingText="Posting…"
          onClick={handleSubmit}
          type="button"
        >
          Post opening balances
        </LoadingButton>
      </div>
    </div>
  );
}
