"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { useAccounts } from "@/hooks/api/accounting";
import {
  useCreateAssetCategory,
  useUpdateAssetCategory,
} from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AssetCategory, DepreciationMethod } from "@/types/accounting/assets";

const METHOD_OPTIONS: ReadonlyArray<{ value: DepreciationMethod; label: string }> = [
  { value: "STRAIGHT_LINE", label: "Straight Line" },
  { value: "DECLINING_BALANCE", label: "Declining Balance" },
  { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
];

const DEPRECIATION_METHODS_LIST: ReadonlyArray<string> = ["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"];

function isDepreciationMethod(v: string): v is DepreciationMethod {
  return DEPRECIATION_METHODS_LIST.includes(v);
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetAccountId: z.number().min(1, "Account required"),
  depreciationExpenseAccountId: z.number().min(1, "Account required"),
  accumulatedDepreciationAccountId: z.number().min(1, "Account required"),
  defaultMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
  defaultUsefulLifeMonths: z.number().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AssetCategory | null;
}

export function CategoryDialog({ open, onOpenChange, editing }: CategoryDialogProps) {
  const createMutation = useCreateAssetCategory();
  const updateMutation = useUpdateAssetCategory(editing?.id ?? 0);
  const accountsQuery = useAccounts({ activeOnly: true, pageSize: 200 });
  const accounts = accountsQuery.data?.items ?? [];

  const defaultValues: CategoryFormValues = {
    name: editing?.name ?? "",
    assetAccountId: editing?.assetAccountId ?? 0,
    depreciationExpenseAccountId: editing?.depreciationExpenseAccountId ?? 0,
    accumulatedDepreciationAccountId: editing?.accumulatedDepreciationAccountId ?? 0,
    defaultMethod: editing?.defaultMethod ?? "STRAIGHT_LINE",
    defaultUsefulLifeMonths: editing?.defaultUsefulLifeMonths ?? undefined,
  };

  function handleSubmit(values: CategoryFormValues): void {
    const action = editing
      ? updateMutation.mutate(values, {
          onSuccess: () => {
            toast.success("Category updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        })
      : createMutation.mutate(values, {
          onSuccess: () => {
            toast.success("Category created");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
    void action;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit Category" : "Create Category"}
      resolver={zodResolver(categorySchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={editing ? "Update" : "Create"}
      resetOnOpen
    >
      {(form) => {
        function handleDefaultMethodChange(v: string): void {
          if (isDepreciationMethod(v)) form.setValue("defaultMethod", v, { shouldValidate: true });
        }

        return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" {...form.register("name")} placeholder="e.g. Machinery" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Asset Account</Label>
            <Select
              value={String(form.watch("assetAccountId") || "")}
              onValueChange={(v) => form.setValue("assetAccountId", Number(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Depreciation Expense Account</Label>
            <Select
              value={String(form.watch("depreciationExpenseAccountId") || "")}
              onValueChange={(v) => form.setValue("depreciationExpenseAccountId", Number(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Accumulated Depreciation Account</Label>
            <Select
              value={String(form.watch("accumulatedDepreciationAccountId") || "")}
              onValueChange={(v) => form.setValue("accumulatedDepreciationAccountId", Number(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Depreciation Method</Label>
            <Select
              value={form.watch("defaultMethod")}
              onValueChange={handleDefaultMethodChange}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-life">Default Useful Life (months)</Label>
            <Input
              id="cat-life"
              type="number"
              min={1}
              {...form.register("defaultUsefulLifeMonths")}
              placeholder="e.g. 60"
            />
          </div>
        </>
        );
      }}
    </EntityFormDialog>
  );
}
