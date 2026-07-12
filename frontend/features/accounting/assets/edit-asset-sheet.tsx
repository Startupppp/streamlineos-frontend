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
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useUpdateAsset } from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AssetDetail, DepreciationMethod } from "@/types/accounting/assets";

const METHOD_OPTIONS: ReadonlyArray<{ value: DepreciationMethod; label: string }> = [
  { value: "STRAIGHT_LINE", label: "Straight Line" },
  { value: "DECLINING_BALANCE", label: "Declining Balance" },
  { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
];

const DEPRECIATION_METHODS_LIST: ReadonlyArray<DepreciationMethod> = ["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"];

function isDepreciationMethod(v: string): v is DepreciationMethod {
  return (DEPRECIATION_METHODS_LIST as ReadonlyArray<string>).includes(v);
}

const editAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  acquisitionDate: z.string().min(1, "Date is required"),
  acquisitionCost: z.number().min(0),
  salvageValue: z.number().min(0),
  usefulLifeMonths: z.number().min(1, "Useful life required"),
  depreciationMethod: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"]),
});

export type EditAssetFormValues = z.infer<typeof editAssetSchema>;

interface EditAssetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetail;
  onSuccess: () => void;
}

export function EditAssetSheet({ open, onOpenChange, asset, onSuccess }: EditAssetSheetProps) {
  const updateMutation = useUpdateAsset(asset.id);

  function handleSubmit(values: EditAssetFormValues): void {
    updateMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Asset updated");
        onSuccess();
        onOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Asset"
      resolver={zodResolver(editAssetSchema)}
      defaultValues={{
        name: asset.name,
        acquisitionDate: asset.acquisitionDate.slice(0, 10),
        acquisitionCost: parseFloat(asset.acquisitionCost),
        salvageValue: parseFloat(asset.salvageValue),
        usefulLifeMonths: asset.usefulLifeMonths,
        depreciationMethod: isDepreciationMethod(asset.depreciationMethod) ? asset.depreciationMethod : "STRAIGHT_LINE",
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateMutation.isPending}
      submitLabel="Update Asset"
      resetOnOpen
    >
      {(form) => {
        function handleDepreciationMethodChange(v: string): void {
          if (isDepreciationMethod(v)) form.setValue("depreciationMethod", v, { shouldValidate: true });
        }

        return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Acquisition Date</Label>
            <Input id="edit-date" type="date" {...form.register("acquisitionDate")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cost">Acquisition Cost</Label>
              <Input id="edit-cost" type="number" min={0} step="0.01" {...form.register("acquisitionCost", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-salvage">Salvage Value</Label>
              <Input id="edit-salvage" type="number" min={0} step="0.01" {...form.register("salvageValue", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-life">Useful Life (months)</Label>
              <Input id="edit-life" type="number" min={1} {...form.register("usefulLifeMonths", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <Select
                value={form.watch("depreciationMethod")}
                onValueChange={handleDepreciationMethodChange}
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
          </div>
        </>
        );
      }}
    </EntityFormSheet>
  );
}
