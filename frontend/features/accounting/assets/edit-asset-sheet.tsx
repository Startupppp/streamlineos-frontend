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
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useUpdateAsset } from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AssetDetail, DepreciationMethod } from "@/types/accounting/assets";

const METHOD_OPTIONS: ReadonlyArray<{ value: DepreciationMethod; label: string }> = [
  { value: "STRAIGHT_LINE", label: "Straight Line" },
  { value: "DECLINING_BALANCE", label: "Declining Balance" },
  { value: "UNITS_OF_PRODUCTION", label: "Units of Production" },
];

const DEPRECIATION_METHODS_LIST: ReadonlyArray<string> = ["STRAIGHT_LINE", "DECLINING_BALANCE", "UNITS_OF_PRODUCTION"];

function isDepreciationMethod(v: string): v is DepreciationMethod {
  return DEPRECIATION_METHODS_LIST.includes(v);
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="edit-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acquisitionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Acquisition Date <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="edit-date" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="acquisitionCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquisition Cost</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salvageValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salvage Value</FormLabel>
                  <FormControl>
                    <Input
                      id="edit-salvage"
                      type="number"
                      min={0}
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="usefulLifeMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful Life (months) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      id="edit-life"
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depreciationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depreciation Method</FormLabel>
                  <Select value={field.value} onValueChange={handleDepreciationMethodChange}>
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
          </div>
        </>
        );
      }}
    </EntityFormSheet>
  );
}
