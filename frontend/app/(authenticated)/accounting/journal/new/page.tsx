"use client";

import { useMemo, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import {
  useAccounts,
  useCreateJournalEntry,
  type CreateJournalEntryInput,
} from "@/hooks/api/accounting";
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

interface LineRowContext {
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

function buildLineColumns(ctx: LineRowContext[]): DataTableColumn<LineRowContext>[] {
  return [
    {
      key: "account",
      header: "Account",
      className: "w-[260px]",
      cell: (row: LineRowContext): ReactNode => {
        function handleAccountChange(value: string): void {
          row.onAccountChange(row.index, value);
        }
        return (
          <Select value={row.accountCode} onValueChange={handleAccountChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {row.accountOptions.map((account) => (
                <SelectItem key={account.id} value={account.code}>
                  {account.code} — {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "debit",
      header: "Debit",
      className: "w-[140px]",
      headerClassName: "text-right",
      cell: (row: LineRowContext): ReactNode => {
        function handleDebitChange(event: ChangeEvent<HTMLInputElement>): void {
          row.onDebitChange(row.index, event.target.value);
        }
        return (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={row.debit}
            onChange={handleDebitChange}
            className="text-right tabular-nums"
            placeholder="0.00"
          />
        );
      },
    },
    {
      key: "credit",
      header: "Credit",
      className: "w-[140px]",
      headerClassName: "text-right",
      cell: (row: LineRowContext): ReactNode => {
        function handleCreditChange(event: ChangeEvent<HTMLInputElement>): void {
          row.onCreditChange(row.index, event.target.value);
        }
        return (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={row.credit}
            onChange={handleCreditChange}
            className="text-right tabular-nums"
            placeholder="0.00"
          />
        );
      },
    },
    {
      key: "lineDescription",
      header: "Line description",
      cell: (row: LineRowContext): ReactNode => {
        function handleDescriptionChange(event: ChangeEvent<HTMLInputElement>): void {
          row.onDescriptionChange(row.index, event.target.value);
        }
        return (
          <Input
            value={row.description}
            onChange={handleDescriptionChange}
            placeholder="Optional"
          />
        );
      },
    },
    {
      key: "remove",
      header: "",
      className: "w-[60px]",
      cell: (row: LineRowContext): ReactNode => {
        function handleRemove(): void {
          row.onRemove(row.index);
        }
        return (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={!row.canRemove}
            aria-label="Remove line"
          >
            <Trash2 className="size-4" />
          </Button>
        );
      },
    },
  ];
}

export default function NewJournalEntryPage() {
  const canCreate = useCan("accounting:journal:create");
  const router = useRouter();
  const accountsQuery = useAccounts({
    page: 1,
    pageSize: 500,
    activeOnly: true,
  });
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
    const debit = round2(
      watchedLines.reduce((acc, line) => acc + parseAmount(line.debit), 0),
    );
    const credit = round2(
      watchedLines.reduce((acc, line) => acc + parseAmount(line.credit), 0),
    );
    return {
      debit,
      credit,
      balanced: Math.abs(debit - credit) < 0.005 && debit > 0,
    };
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
        toast.error(
          `Line for ${line.accountCode}: must have exactly one of debit or credit > 0`,
        );
        return;
      }
    }
    if (!totals.balanced) {
      toast.error(
        `Unbalanced: debit ${totals.debit.toFixed(2)} ≠ credit ${totals.credit.toFixed(2)}`,
      );
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
      toast.error(getErrorMessage(error));
    }
  }

  if (accountsQuery.isLoading) return <LoadingState variant="form" />;
  if (accountsQuery.error) {
    return (
      <ErrorState
        description={getErrorMessage(accountsQuery.error)}
        onRetry={handleAccountsRetry}
      />
    );
  }
  if (!canCreate) {
    return (
      <PageWrapper eyebrow="Accounting · Journal" title="New journal entry" subtitle="Record a manual journal entry. Debits must equal credits before posting.">
        <EmptyState
          illustrationPreset="security"
          title="Access restricted"
          description="You don't have permission to create journal entries."
        />
      </PageWrapper>
    );
  }

  const accountOptions = accountsQuery.data?.items ?? [];

  const lineRows: LineRowContext[] = fields.map((field, index) => ({
    index,
    accountOptions,
    canRemove: fields.length > 2,
    accountCode: watchedLines[index]?.accountCode ?? "",
    debit: watchedLines[index]?.debit ?? "",
    credit: watchedLines[index]?.credit ?? "",
    description: watchedLines[index]?.description ?? "",
    onAccountChange: handleAccountChange,
    onDebitChange: handleDebitChange,
    onCreditChange: handleCreditChange,
    onDescriptionChange: handleDescriptionChange,
    onRemove: handleRemoveLine,
  }));

  const lineColumns = buildLineColumns(lineRows);

  const tableFooter = (
    <>
      <div className="flex items-center gap-4 text-sm font-medium">
        <span className="min-w-[260px]">Totals</span>
        <span className="min-w-[140px] text-right tabular-nums">{totals.debit.toFixed(2)}</span>
        <span className="min-w-[140px] text-right tabular-nums">{totals.credit.toFixed(2)}</span>
        <span className="flex-1">
          {totals.debit === 0 && totals.credit === 0 ? (
            <span className="text-muted-foreground">Enter amounts</span>
          ) : totals.balanced ? (
            <span className="text-emerald-600">Balanced ✓</span>
          ) : (
            <span className="text-rose-600">
              Off by {Math.abs(totals.debit - totals.credit).toFixed(2)}
            </span>
          )}
        </span>
      </div>
      <div className="pt-2 border-t border-slate-200/60 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
        >
          <Plus className="size-4 mr-1" />
          Add line
        </Button>
      </div>
    </>
  );

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
                      <DatePicker id="entry-date" value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
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

          <DataTable
            data={lineRows}
            columns={lineColumns}
            getRowKey={(row) => row.index}
            footer={tableFooter}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isPending={createMutation.isPending}
              disabled={!totals.balanced}
              loadingText="Saving…"
            >
              {watchedStatus === "POSTED" ? "Create and post" : "Save as draft"}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
