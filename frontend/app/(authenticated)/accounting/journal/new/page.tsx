"use client";

import { useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useAccounts,
  useCreateJournalEntry,
  type CreateJournalEntryInput,
} from "@/lib/api/hooks/accounting";
import type { Account } from "@/types/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const lineSchema = z.object({
  accountCode: z.string(),
  debit: z.string(),
  credit: z.string(),
  description: z.string(),
});

const formSchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["DRAFT", "POSTED"]),
  lines: z.array(lineSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface LineRowProps {
  index: number;
  accountOptions: Account[];
  canRemove: boolean;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  onAccountChange: (index: number, value: string) => void;
  onDebitChange: (index: number, value: string) => void;
  onCreditChange: (index: number, value: string) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function LineRow({
  index,
  accountOptions,
  canRemove,
  accountCode,
  debit,
  credit,
  description,
  onAccountChange,
  onDebitChange,
  onCreditChange,
  onDescriptionChange,
  onRemove,
}: LineRowProps) {
  function handleAccountChange(value: string): void {
    onAccountChange(index, value);
  }

  function handleDebitChange(event: ChangeEvent<HTMLInputElement>): void {
    onDebitChange(index, event.target.value);
  }

  function handleCreditChange(event: ChangeEvent<HTMLInputElement>): void {
    onCreditChange(index, event.target.value);
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLInputElement>): void {
    onDescriptionChange(index, event.target.value);
  }

  function handleRemove(): void {
    onRemove(index);
  }

  return (
    <TableRow>
      <TableCell>
        <Select value={accountCode} onValueChange={handleAccountChange}>
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
          value={debit}
          onChange={handleDebitChange}
          className="text-right tabular-nums"
          placeholder="0.00"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={credit}
          onChange={handleCreditChange}
          className="text-right tabular-nums"
          placeholder="0.00"
        />
      </TableCell>
      <TableCell>
        <Input
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Optional"
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={!canRemove}
          aria-label="Remove line"
        >
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const accountsQuery = useAccounts({ page: 1, pageSize: 500, activeOnly: true });
  const createMutation = useCreateJournalEntry();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryDate: todayIso(),
      description: "",
      status: "DRAFT",
      lines: [
        { accountCode: "", debit: "", credit: "", description: "" },
        { accountCode: "", debit: "", credit: "", description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = form.watch("lines");
  const watchedStatus = form.watch("status");

  const totals = useMemo(() => {
    const debit = round2(watchedLines.reduce((acc, line) => acc + parseAmount(line.debit), 0));
    const credit = round2(watchedLines.reduce((acc, line) => acc + parseAmount(line.credit), 0));
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [watchedLines]);

  function handleAccountChange(index: number, value: string): void {
    form.setValue(`lines.${index}.accountCode`, value);
  }

  function handleDebitChange(index: number, value: string): void {
    form.setValue(`lines.${index}.debit`, value);
    if (value && Number(value) > 0) {
      form.setValue(`lines.${index}.credit`, "");
    }
  }

  function handleCreditChange(index: number, value: string): void {
    form.setValue(`lines.${index}.credit`, value);
    if (value && Number(value) > 0) {
      form.setValue(`lines.${index}.debit`, "");
    }
  }

  function handleDescriptionChange(index: number, value: string): void {
    form.setValue(`lines.${index}.description`, value);
  }

  function handleAddLine(): void {
    append({ accountCode: "", debit: "", credit: "", description: "" });
  }

  function handleRemoveLine(index: number): void {
    if (fields.length > 2) remove(index);
  }

  function handleCancel(): void {
    router.push("/accounting/journal");
  }

  function handleAccountsRetry(): void {
    void accountsQuery.refetch();
  }

  async function handleSubmit(values: FormValues): Promise<void> {
    const filled = values.lines.filter((line) => line.accountCode);
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
      entryDate: values.entryDate,
      description: values.description.trim(),
      status: values.status,
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
  if (accountsQuery.error) {
    return (
      <ErrorState
        description={accountsQuery.error.message}
        onRetry={handleAccountsRetry}
      />
    );
  }

  const accountOptions = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Journal"
      title="New journal entry"
      subtitle="Record a manual journal entry. Debits must equal credits before posting."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry date</FormLabel>
                    <FormControl>
                      <Input id="entry-date" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger id="entry-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="POSTED">Post immediately</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        id="entry-description"
                        {...field}
                        rows={2}
                        placeholder="What does this entry record?"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <LineRow
                    key={field.id}
                    index={index}
                    accountOptions={accountOptions}
                    canRemove={fields.length > 2}
                    accountCode={watchedLines[index]?.accountCode ?? ""}
                    debit={watchedLines[index]?.debit ?? ""}
                    credit={watchedLines[index]?.credit ?? ""}
                    description={watchedLines[index]?.description ?? ""}
                    onAccountChange={handleAccountChange}
                    onDebitChange={handleDebitChange}
                    onCreditChange={handleCreditChange}
                    onDescriptionChange={handleDescriptionChange}
                    onRemove={handleRemoveLine}
                  />
                ))}
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell>Totals</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.debit.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.credit.toFixed(2)}
                  </TableCell>
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
                  <TableCell />
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
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !totals.balanced}
            >
              {createMutation.isPending
                ? "Saving…"
                : watchedStatus === "POSTED"
                ? "Create and post"
                : "Save as draft"}
            </Button>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
