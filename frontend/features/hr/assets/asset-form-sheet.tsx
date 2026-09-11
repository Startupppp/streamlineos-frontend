"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/components/shared/hr-sheet";
import { assetFormSchema, type AssetFormValues } from "./asset-schema";
import { ASSET_TYPES } from "./asset-constants";
import type { Asset } from "@/types/hr";
import { numericFieldChange } from "@/lib/numeric-field";

function AssetFormFields({
  form,
  existingAssets,
  currentAssetId,
  isPending,
  submitLabel,
  onSubmit,
}: {
  form: ReturnType<typeof useForm<AssetFormValues>>;
  existingAssets: Asset[];
  currentAssetId?: number;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (values: AssetFormValues) => void;
}) {
  const handleFormSubmit = useCallback(
    (values: AssetFormValues) => {
      const normalizedSerial = values.serialNumber.trim().toLowerCase();
      const duplicate = existingAssets.find(
        (a) =>
          a.serialNumber?.trim().toLowerCase() === normalizedSerial &&
          a.id !== currentAssetId,
      );
      if (duplicate) {
        form.setError("serialNumber", {
          message: "An asset with this serial number already exists.",
        });
        return;
      }
      onSubmit(values);
    },
    [existingAssets, currentAssetId, form, onSubmit],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Asset Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. MacBook Pro 16-inch" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Serial Number <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="SN123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Brand <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Apple" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Model <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="M3 Pro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick date"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchaseCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Cost (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    step={0.01}
                    value={field.value ?? ""}
                    onChange={numericFieldChange(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Bangalore Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional notes..."
                  rows={2}
                  className="resize-none w-full"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton type="submit" className="w-full mt-2" isPending={isPending}>
          {submitLabel}
        </LoadingButton>
      </form>
    </Form>
  );
}

export function AddAssetSheet({
  open,
  onOpenChange,
  form,
  assets,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<AssetFormValues>>;
  assets: Asset[];
  isPending: boolean;
  onSubmit: (values: AssetFormValues) => void;
}) {
  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Register Asset"
      description="Register a new company asset. Employee assignment can be done after creation."
      showSubmit={false}
    >
      <AssetFormFields
        form={form}
        existingAssets={assets}
        isPending={isPending}
        submitLabel="Register Asset"
        onSubmit={onSubmit}
      />
    </HrSheet>
  );
}

export function EditAssetSheet({
  editAsset,
  onOpenChange,
  form,
  assets,
  isPending,
  onSubmit,
}: {
  editAsset: Asset | null;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<AssetFormValues>>;
  assets: Asset[];
  isPending: boolean;
  onSubmit: (values: AssetFormValues) => void;
}) {
  return (
    <HrSheet
      open={editAsset !== null}
      onOpenChange={onOpenChange}
      title="Edit Asset"
      description="Update asset details. Use the assign button in the table to change employee assignment."
      showSubmit={false}
    >
      <AssetFormFields
        form={form}
        existingAssets={assets}
        currentAssetId={editAsset?.id}
        isPending={isPending}
        submitLabel="Save Changes"
        onSubmit={onSubmit}
      />
    </HrSheet>
  );
}

export function useAssetForm() {
  return useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      type: "Laptop",
      brand: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      purchaseCost: undefined,
      location: "",
      notes: "",
    },
    mode: "onBlur",
  });
}

export function useEditAssetForm() {
  return useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: "onBlur",
  });
}
