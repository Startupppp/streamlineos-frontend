"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  isWriteOffReason,
  useCreateAdjustment,
  type AdjustmentReason,
} from "@/hooks/api/inventory/stock";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { LocationSelect } from "@/components/inventory/location-select";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z
  .object({
    warehouseId: z.number({ error: "Warehouse is required" }).int().positive(),
    locationId: z.number({ error: "Location is required" }).int().positive(),
    productVariantId: z.number({ error: "Product variant is required" }).int().positive(),
    adjustmentType: z.enum(["IN", "OUT"]),
    quantity: z.number({ error: "Quantity is required" }).min(0.0001, "Must be positive"),
    reason: z.enum(["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER", "SCRAP"]),
    scrapLocationId: z.number().int().positive().optional(),
    notes: z.string().max(500).optional(),
  })
  // The same rule the API enforces, said here so the operator sees it before
  // they submit rather than as a 400 afterwards: a reason that condemns stock
  // can only take stock away.
  .refine((v) => !(isWriteOffReason(v.reason) && v.adjustmentType === "IN"), {
    path: ["adjustmentType"],
    message: "A write-off can only remove stock",
  });

type FormValues = z.infer<typeof schema>;

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase", SALE: "Sale", RETURN: "Return", DAMAGE: "Damage",
  EXPIRY: "Expiry", THEFT: "Theft / Loss", RECOUNT: "Recount", OTHER: "Other",
  SCRAP: "Scrap / Write-off",
};

const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER", "SCRAP"];

const SCRAP_LOCATION_TYPES = ["SCRAP"] as const;

interface CreateAdjustmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdjustmentSheet({ open, onOpenChange }: CreateAdjustmentSheetProps) {
  const createMutation = useCreateAdjustment();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { adjustmentType: "IN", reason: "RECOUNT" },
  });

  const { control, handleSubmit, watch, reset, resetField, setValue } = form;

  const warehouseId = watch("warehouseId");
  const reason = watch("reason");
  const writeOff = isWriteOffReason(reason);

  // A write-off only ever removes stock, so choosing one settles the direction
  // rather than leaving the operator to discover the rule from a form error.
  const handleReasonChange = useCallback(
    (value: string) => {
      const next = value as AdjustmentReason;
      setValue("reason", next, { shouldValidate: true });
      if (isWriteOffReason(next)) setValue("adjustmentType", "OUT", { shouldValidate: true });
      else setValue("scrapLocationId", undefined);
    },
    [setValue],
  );

  const handleClose = useCallback(() => {
    reset({ adjustmentType: "IN", reason: "RECOUNT" });
    onOpenChange(false);
  }, [reset, onOpenChange]);

  function handleSheetChange(nextOpen: boolean): void {
    if (!nextOpen) handleClose();
  }

  function onSubmit(values: FormValues): void {
    createMutation.mutate(
      {
        productVariantId: values.productVariantId,
        locationId: values.locationId,
        adjustmentType: values.adjustmentType,
        quantity: values.quantity,
        reason: values.reason,
        scrapLocationId: writeOff ? values.scrapLocationId : undefined,
        notes: values.notes?.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          const msg =
            result.status === "PENDING_APPROVAL"
              ? "Adjustment created — awaiting approval"
              : "Adjustment created";
          toast.success(msg);
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleCreate = handleSubmit(onSubmit);

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 border-b border-border bg-muted/40 p-6 pb-4 pr-12 text-left">
          <SheetTitle>New Stock Adjustment</SheetTitle>
          <SheetDescription>Manually adjust stock quantities to correct discrepancies.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <SheetBody className="space-y-4 px-6 py-4">
            <FormField
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <WarehouseSelect
                      value={String(field.value ?? "")}
                      onChange={(v) => { field.onChange(Number(v)); resetField("locationId"); }}
                      activeOnly
                      ariaLabel="Warehouse"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <LocationSelect
                      warehouseId={warehouseId}
                      value={String(field.value ?? "")}
                      onChange={(v) => field.onChange(Number(v))}
                      ariaLabel="Location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="productVariantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Variant <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <ProductVariantCombobox
                      value={String(field.value ?? "")}
                      onChange={(v) => field.onChange(Number(v))}
                      activeOnly
                      ariaLabel="Product Variant"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">In (Add stock)</SelectItem>
                      <SelectItem value="OUT">Out (Remove stock)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="text-destructive">*</span></FormLabel>
                  <Select value={field.value} onValueChange={handleReasonChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {writeOff ? (
              <FormField
                control={control}
                name="scrapLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scrap Location</FormLabel>
                    <FormControl>
                      <LocationSelect
                        warehouseId={warehouseId}
                        value={String(field.value ?? "")}
                        onChange={(v) => field.onChange(Number(v))}
                        locationTypes={SCRAP_LOCATION_TYPES}
                        placeholder="Warehouse default scrap bin"
                        activeOnly
                        ariaLabel="Scrap Location"
                      />
                    </FormControl>
                    <FormDescription>
                      Where the condemned goods physically go. Left blank, the warehouse&apos;s own scrap
                      bin is recorded. The stock leaves inventory either way.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details…" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SheetBody>
        </Form>

        <SheetFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton className="flex-1" isPending={createMutation.isPending} loadingText="Creating…" onClick={handleCreate}>
            Create Adjustment
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
