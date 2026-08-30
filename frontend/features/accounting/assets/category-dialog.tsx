"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
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
  const accountsQuery = useAccounts({ activeOnly: true, limit: 100 });
  const accounts = accountsQuery.data?.data ?? [];

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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="cat-name" {...field} placeholder="e.g. Machinery" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Account <span className="text-destructive">*</span></FormLabel>
                <Select
                  value={String(field.value || "")}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.name}
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
            name="depreciationExpenseAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Depreciation Expense Account <span className="text-destructive">*</span></FormLabel>
                <Select
                  value={String(field.value || "")}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.name}
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
            name="accumulatedDepreciationAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accumulated Depreciation Account <span className="text-destructive">*</span></FormLabel>
                <Select
                  value={String(field.value || "")}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.name}
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
            name="defaultMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Depreciation Method</FormLabel>
                <Select value={field.value} onValueChange={handleDefaultMethodChange}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultUsefulLifeMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Useful Life (months)</FormLabel>
                <FormControl>
                  <Input
                    id="cat-life"
                    type="number"
                    min={1}
                    placeholder="e.g. 60"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
        );
      }}
    </EntityFormDialog>
  );
}
