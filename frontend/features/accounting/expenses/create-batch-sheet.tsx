"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Money } from "@/features/accounting/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { useCreateReimbursementBatch, usePendingForBatch } from "@/hooks/api/accounting/expenses";
import type { ExpenseWithRelations } from "@/types/hr/expenses";
import { TruncatedText } from "@/components/ui/truncated-text";

const batchSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

type BatchForm = z.infer<typeof batchSchema>;

interface CreateBatchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateBatchSheet({ open, onOpenChange, onCreated }: CreateBatchSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const pendingQuery = usePendingForBatch();
  const mutation = useCreateReimbursementBatch();

  const form = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: { name: "" },
  });

  const pendingExpenses = useMemo<ExpenseWithRelations[]>(
    () => pendingQuery.data?.expenses ?? [],
    [pendingQuery.data],
  );

  const runningTotal = useMemo(
    () =>
      pendingExpenses
        .filter((e) => selectedIds.has(e.id))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    [pendingExpenses, selectedIds],
  );

  const handleToggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === pendingExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingExpenses.map((e) => e.id)));
    }
  }, [selectedIds.size, pendingExpenses]);

  const handleSubmit = useCallback(
    (values: BatchForm) => {
      if (selectedIds.size === 0) {
        toast.error("Select at least one expense");
        return;
      }
      mutation.mutate(
        { name: values.name, expenseIds: Array.from(selectedIds) },
        {
          onSuccess: () => {
            toast.success("Reimbursement batch created");
            form.reset();
            setSelectedIds(new Set());
            onOpenChange(false);
            onCreated?.();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [mutation, selectedIds, form, onOpenChange, onCreated],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSelectedIds(new Set());
    form.reset();
  }, [form, onOpenChange]);

  const handleRowClick = useCallback(
    (id: number) => () => handleToggle(id),
    [handleToggle],
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  const allSelected = pendingExpenses.length > 0 && selectedIds.size === pendingExpenses.length;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create Reimbursement Batch"
      description="Group approved expenses for batch payment"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={mutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            isPending={mutation.isPending}
            onClick={form.handleSubmit(handleSubmit)}
            disabled={selectedIds.size === 0}
          >
            Create batch ({selectedIds.size})
          </LoadingButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Batch name <span className="text-destructive">*</span></Label>
          <Input
            {...form.register("name")}
            className="text-sm"
            placeholder="e.g. July reimbursements"
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">
              Pending expenses ({pendingExpenses.length})
            </Label>
            {pendingExpenses.length > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={handleSelectAll}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          {pendingQuery.isLoading && (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
          )}

          {!pendingQuery.isLoading && pendingExpenses.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No expenses in REIMBURSEMENT_PENDING status.
            </p>
          )}

          <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
            {pendingExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                onClick={handleRowClick(expense.id)}
              >
                <Checkbox
                  checked={selectedIds.has(expense.id)}
                  onCheckedChange={() => handleToggle(expense.id)}
                  onClick={handleCheckboxClick}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <TruncatedText text={getUserDisplayName(expense.user)} className="text-sm" />
                  <TruncatedText text={`${expense.category} · ${expense.expenseDate}`} className="text-xs text-muted-foreground" />
                </div>
                <Money value={parseFloat(expense.amount)} className="text-sm font-medium shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 border border-border">
            <p className="text-xs font-medium">{selectedIds.size} selected · Total</p>
            <Money value={runningTotal} className="text-sm font-semibold" />
          </div>
        )}
      </div>
    </AppSheet>
  );
}
