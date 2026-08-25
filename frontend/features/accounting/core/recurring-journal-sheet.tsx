"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/api/accounting";
import {
  useCreateRecurringJournal,
  useUpdateRecurringJournal,
} from "@/hooks/api/accounting/core";
import type { RecurringJournal, RecurringFrequency } from "@/hooks/api/accounting/core";

const FREQUENCIES: RecurringFrequency[] = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
];

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

const lineSchema = z.object({
  accountId: z.string().min(1, "Account required"),
  debit: z.string(),
  credit: z.string(),
  description: z.string().optional(),
});

const recurringSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const),
  nextRunDate: z.string().min(1, "Next run date is required"),
  endDate: z.string().optional(),
  lines: z.array(lineSchema).min(2, "At least 2 lines required"),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;
type LineValue = RecurringFormValues["lines"][number];
type LineRow = LineValue & { _fieldId: string; _index: number };

function parseMoney(value: string): number {
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getDefaultValues(template?: RecurringJournal | null): RecurringFormValues {
  if (!template) {
    return {
      name: "",
      description: "",
      frequency: "MONTHLY",
      nextRunDate: "",
      endDate: "",
      lines: [
        { accountId: "", debit: "", credit: "", description: "" },
        { accountId: "", debit: "", credit: "", description: "" },
      ],
    };
  }
  return {
    name: template.name,
    description: template.description ?? "",
    frequency: template.frequency,
    nextRunDate: template.nextRunDate,
    endDate: template.endDate ?? "",
    lines: template.lines.map((l) => ({
      accountId: String(l.accountId),
      debit: l.debit > 0 ? String(l.debit) : "",
      credit: l.credit > 0 ? String(l.credit) : "",
      description: l.description ?? "",
    })),
  };
}

interface RecurringJournalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  template?: RecurringJournal | null;
}

export function RecurringJournalSheet({
  open,
  onOpenChange,
  mode,
  template,
}: RecurringJournalSheetProps) {
  const accountsQuery = useAccounts({ activeOnly: true, pageSize: 500 });
  const accounts = accountsQuery.data?.items ?? [];

  const createMutation = useCreateRecurringJournal();
  const updateMutation = useUpdateRecurringJournal(template?.id ?? 0);

  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: getDefaultValues(template),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = form.watch("lines");
  const totalDebit = watchedLines.reduce((sum, l) => sum + parseMoney(l.debit), 0);
  const totalCredit = watchedLines.reduce((sum, l) => sum + parseMoney(l.credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005;

  function handleAddLine(): void {
    append({ accountId: "", debit: "", credit: "", description: "" });
  }

  function handleClose(isOpen: boolean): void {
    if (!isOpen) {
      form.reset(getDefaultValues(null));
    }
    onOpenChange(isOpen);
  }

  function handleCancelClick(): void {
    handleClose(false);
  }

  function handleRemoveLine(index: number): void {
    remove(index);
  }

  function handleSubmit(values: RecurringFormValues): void {
    const lines = values.lines.map((l) => ({
      accountId: parseInt(l.accountId, 10),
      debit: parseMoney(l.debit),
      credit: parseMoney(l.credit),
      description: l.description || undefined,
    }));

    const payload = {
      name: values.name,
      description: values.description || undefined,
      frequency: values.frequency,
      nextRunDate: values.nextRunDate,
      endDate: values.endDate || undefined,
      lines,
    };

    if (mode === "edit" && template) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Template updated");
          handleClose(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Template created");
          handleClose(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const lineColumns: DataTableColumn<LineRow>[] = [
    {
      key: "accountId",
      header: "Account",
      cell: (row) => (
        <FormField
          control={form.control}
          name={`lines.${row._index}.accountId`}
          render={({ field: f }) => (
            <Select value={f.value} onValueChange={f.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      ),
    },
    {
      key: "debit",
      header: "Dr",
      headerClassName: "w-[80px] text-right",
      className: "w-[80px]",
      cell: (row) => (
        <FormField
          control={form.control}
          name={`lines.${row._index}.debit`}
          render={({ field: f }) => (
            <Input
              {...f}
              className="text-xs text-right font-mono"
              placeholder="0.00"
            />
          )}
        />
      ),
    },
    {
      key: "credit",
      header: "Cr",
      headerClassName: "w-[80px] text-right",
      className: "w-[80px]",
      cell: (row) => (
        <FormField
          control={form.control}
          name={`lines.${row._index}.credit`}
          render={({ field: f }) => (
            <Input
              {...f}
              className="text-xs text-right font-mono"
              placeholder="0.00"
            />
          )}
        />
      ),
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-7",
      className: "w-7 text-right",
      cell: (row) => {
        function handleRemove(): void {
          handleRemoveLine(row._index);
        }
        return fields.length > 2 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null;
      },
    },
  ];

  const lineRows: LineRow[] = fields.map((field, index) => ({
    accountId: watchedLines[index]?.accountId ?? "",
    debit: watchedLines[index]?.debit ?? "",
    credit: watchedLines[index]?.credit ?? "",
    description: watchedLines[index]?.description,
    _fieldId: field.id,
    _index: index,
  }));

  return (
    <AppSheet
      open={open}
      onOpenChange={handleClose}
      title={mode === "edit" ? "Edit recurring template" : "New recurring template"}
      description="Set up a journal entry that runs automatically on a schedule."
      className="w-full sm:max-w-xl"
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancelClick}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            isPending={isPending}
            loadingText="Saving…"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {mode === "edit" ? "Save changes" : "Create template"}
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Monthly depreciation" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={2}
                    placeholder="Optional notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {FREQUENCY_LABELS[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextRunDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next run date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick date"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date (optional)</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="No end date"
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Lines</p>
              <span
                className={cn(
                  "text-xs font-medium",
                  isBalanced ? "text-status-success-ink" : "text-status-danger-ink",
                )}
              >
                {isBalanced
                  ? "Balanced"
                  : `Unbalanced (Dr ${totalDebit.toFixed(2)} / Cr ${totalCredit.toFixed(2)})`}
              </span>
            </div>

            <DataTable
              data={lineRows}
              columns={lineColumns}
              getRowKey={(row) => row._fieldId}
            />

            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add line
            </Button>
          </div>
        </form>
      </Form>
    </AppSheet>
  );
}
