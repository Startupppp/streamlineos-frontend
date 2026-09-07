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
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { useUpdateAsset } from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AssetDetail } from "@/types/accounting/assets";
import { numericFieldChangeOr } from "@/lib/numeric-field";

const editAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  salvageValue: z.number().min(0),
  usefulLifeMonths: z.number().min(1, "Useful life required"),
});

export type EditAssetFormValues = z.infer<typeof editAssetSchema>;

interface EditAssetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetail;
  onSuccess: () => void;
}

export function EditAssetSheet({ open, onOpenChange, asset, onSuccess }: EditAssetSheetProps) {
  const updateMutation = useUpdateAsset(asset.asset.id);

  function handleSubmit(values: EditAssetFormValues): void {
    updateMutation.mutate(
      {
        name: values.name,
        salvageValue: String(values.salvageValue),
        usefulLifeMonths: values.usefulLifeMonths,
      },
      {
        onSuccess: () => {
          toast.success("Asset updated");
          onSuccess();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <EntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Asset"
      resolver={zodResolver(editAssetSchema)}
      defaultValues={{
        name: asset.asset.name,
        salvageValue: parseFloat(asset.asset.salvageValue),
        usefulLifeMonths: asset.asset.usefulLifeMonths,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateMutation.isPending}
      submitLabel="Update Asset"
      resetOnOpen
    >
      {(form) => (
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
          <div className="grid grid-cols-2 gap-3">
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
                      onChange={numericFieldChangeOr(field.onChange, 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      onChange={numericFieldChangeOr(field.onChange, 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </EntityFormSheet>
  );
}
