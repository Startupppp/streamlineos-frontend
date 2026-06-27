"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAccounts, useCreateJournalEntry, type CreateJournalEntryInput } from "@/lib/api/hooks/accounting";

interface DraftLine {
  key: number;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(key: number): DraftLine {
  return { key, accountCode: "", debit: "", credit: "", description: "" };
}

function parseAmount(value: string): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const accountsQuery = useAccounts({ page: 1, pageSize: 500, activeOnly: true });
  const createMutation = useCreateJournalEntry();

  const [entryDate, setEntryDate] = useState<string>(todayIso());
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "POSTED">("DRAFT");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0), emptyLine(1)]);
  const [nextKey, setNextKey] = useState<number>(2);

  const totals = useMemo(() => {
    const debit = round2(lines.reduce((acc, line) => acc + parseAmount(line.debit), 0));
    const credit = round2(lines.reduce((acc, line) => acc + parseAmount(line.credit), 0));
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [lines]);

  function handleEntryDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setEntryDate(event.target.value);
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setDescription(event.target.value);
  }

  function handleStatusChange(value: string): void {
    if (value === "DRAFT" || value === "POSTED") setStatus(value);
  }

  function updateLine(key: number, patch: Partial<DraftLine>): void {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function handleAccountChange(key: number, value: string): void {
    updateLine(key, { accountCode: value });
  }

  function handleDebitChange(key: number, event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    updateLine(key, { debit: value, credit: value && Number(value) > 0 ? "" : (lines.find((l) => l.key === key)?.credit ?? "") });
  }

  function handleCreditChange(key: number, event: ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    updateLine(key, { credit: value, debit: value && Number(value) > 0 ? "" : (lines.find((l) => l.key === key)?.debit ?? "") });
  }

  function handleLineDescriptionChange(key: number, event: ChangeEvent<HTMLInputElement>): void {
    updateLine(key, { description: event.target.value });
  }

  function handleAddLine(): void {
    setLines((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function handleRemoveLine(key: number): void {
    setLines((prev) => (prev.length > 2 ? prev.filter((line) => line.key !== key) : prev));
  }

  async function handleSubmit(): Promise<void> {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    const filled = lines.filter((line) => line.accountCode);
    if (filled.length < 2) {
      toast.error("At least two lines with an account are required");
      return;
    }
    for (const line of filled) {
      const debit = parseAmount(line.debit);
      const credit = parseAmount(line.credit);
      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        toast.error(`Line for ${line.accountCode}: must have exactly one of debit or credit > 0`);
        return;
      }
    }
    if (!totals.balanced) {
      toast.error(`Unbalanced: debit ${totals.debit.toFixed(2)} ≠ credit ${totals.credit.toFixed(2)}`);
      return;
    }

    const payload: CreateJournalEntryInput = {
      entryDate,
      description: description.trim(),
      status,
      lines: filled.map((line) => ({
        accountCode: line.accountCode,
        debit: parseAmount(line.debit),
        credit: parseAmount(line.credit),
        description: line.description ? line.description : undefined,
      })),
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success(`Entry ${result.entryNumber} created`);
      router.push(`/accounting/journal/${result.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create entry";
      toast.error(message);
    }
  }

  if (accountsQuery.isLoading) return <LoadingState variant="form" />;
  if (accountsQuery.error) return <ErrorState description={accountsQuery.error.message} />;

  const accountOptions = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title="New journal entry"
      subtitle="Record a manual journal entry. Debits must equal credits before posting."
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="entry-date" className="text-sm text-muted-foreground block mb-1">Entry date</label>
              <Input id="entry-date" type="date" value={entryDate} onChange={handleEntryDateChange} />
            </div>
            <div>
              <label htmlFor="entry-status" className="text-sm text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger id="entry-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="POSTED">Post immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="entry-description" className="text-sm text-muted-foreground block mb-1">Description</label>
              <Textarea
                id="entry-description"
                value={description}
                onChange={handleDescriptionChange}
                rows={2}
                placeholder="What does this entry record?"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Account</TableHead>
                <TableHead className="text-right w-[140px]">Debit</TableHead>
                <TableHead className="text-right w-[140px]">Credit</TableHead>
                <TableHead>Line description</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Select value={line.accountCode} onValueChange={(value) => handleAccountChange(line.key, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {accountOptions.map((account) => (
                          <SelectItem key={account.id} value={account.code}>
                            {account.code} — {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit}
                      onChange={(event) => handleDebitChange(line.key, event)}
                      className="text-right tabular-nums"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit}
                      onChange={(event) => handleCreditChange(line.key, event)}
                      className="text-right tabular-nums"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description}
                      onChange={(event) => handleLineDescriptionChange(line.key, event)}
                      placeholder="Optional"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLine(line.key)}
                      disabled={lines.length <= 2}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell className="text-right tabular-nums">{totals.debit.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.credit.toFixed(2)}</TableCell>
                <TableCell>
                  {totals.debit === 0 && totals.credit === 0 ? (
                    <span className="text-sm text-muted-foreground">Enter amounts</span>
                  ) : totals.balanced ? (
                    <span className="text-sm text-emerald-600">Balanced ✓</span>
                  ) : (
                    <span className="text-sm text-rose-600">
                      Off by {Math.abs(totals.debit - totals.credit).toFixed(2)}
                    </span>
                  )}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="p-3 border-t border-slate-200/60">
            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="size-4 mr-1" />
              Add line
            </Button>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/accounting/journal")}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending || !totals.balanced}>
            {createMutation.isPending ? "Saving…" : status === "POSTED" ? "Create and post" : "Save as draft"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
