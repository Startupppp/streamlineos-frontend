import { parseMoneyInput, sumMinor } from "@/lib/accounting/money";
import type { JournalLineFormValues } from "./journal-schema";

export interface JournalTotals {
  debitMinor: number;
  creditMinor: number;
  differenceMinor: number;
  balanced: boolean;
  hasAmounts: boolean;
  invalidLineIndexes: number[];
}

export function lineMinor(
  line: JournalLineFormValues,
  currency: string,
): number | null {
  if (line.amount.trim() === "") return null;
  const parsed = parseMoneyInput(line.amount, currency);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
}

export function journalTotals(
  lines: readonly JournalLineFormValues[],
  currency: string,
): JournalTotals {
  const debits: number[] = [];
  const credits: number[] = [];
  const invalidLineIndexes: number[] = [];

  lines.forEach((line, index) => {
    const minor = lineMinor(line, currency);
    if (minor === null) {
      if (line.amount.trim() !== "") invalidLineIndexes.push(index);
      return;
    }
    if (line.side === "debit") debits.push(minor);
    else credits.push(minor);
  });

  const debitMinor = sumMinor(debits);
  const creditMinor = sumMinor(credits);

  return {
    debitMinor,
    creditMinor,
    differenceMinor: debitMinor - creditMinor,
    balanced: debitMinor === creditMinor && debitMinor > 0,
    hasAmounts: debits.length + credits.length > 0,
    invalidLineIndexes,
  };
}

export function readLineIndex(details: unknown): number | undefined {
  if (typeof details !== "object" || details === null || !("lineIndex" in details))
    return undefined;
  const value: unknown = details.lineIndex;
  return typeof value === "number" ? value : undefined;
}
