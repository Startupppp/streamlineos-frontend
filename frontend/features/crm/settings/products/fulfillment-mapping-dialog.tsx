"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateOfferFulfillmentMapping,
  useUpdateOfferFulfillmentMapping,
} from "@/hooks/api/crm/offer-fulfillment";
import type { OfferFulfillmentComponent } from "@/hooks/api/crm/offer-fulfillment-schema";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { fulfillmentMappingSchema, type FulfillmentMappingValues } from "./fulfillment-mapping-schema";

interface FulfillmentMappingDialogProps {
  crmOfferId: number;
  /** `null` adds a mapping; a row edits its quantity, unit and notes (the variant is fixed once mapped). */
  mapping: OfferFulfillmentComponent | null;
  onOpenChange: (open: boolean) => void;
}

function handleMutationError(error: unknown) {
  toast.error(
    isApiError(error) && error.status === 409
      ? "This product is already mapped to that variant. Edit the existing mapping instead."
      : getErrorMessage(error),
  );
}

/** Mounted only while open, so its default values are read fresh each time. */
export function FulfillmentMappingDialog({ crmOfferId, mapping, onOpenChange }: FulfillmentMappingDialogProps) {
  const create = useCreateOfferFulfillmentMapping();
  const update = useUpdateOfferFulfillmentMapping();

  function handleSubmit(values: FulfillmentMappingValues) {
    const quantityPerUnit = Number(values.quantityPerUnit);
    const uom = values.uom.trim();
    const notes = values.notes.trim();
    if (mapping) {
      update.mutate(
        {
          offerFulfillmentComponentId: mapping.offerFulfillmentComponentId,
          quantityPerUnit,
          uom: uom || null,
          notes: notes || null,
        },
        {
          onSuccess: () => {
            toast.success("Mapping updated");
            onOpenChange(false);
          },
          onError: handleMutationError,
        },
      );
      return;
    }
    create.mutate(
      {
        crmOfferId,
        invSkuId: Number(values.invSkuId),
        quantityPerUnit,
        ...(uom ? { uom } : {}),
        ...(notes ? { notes } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Mapping added");
          onOpenChange(false);
        },
        onError: handleMutationError,
      },
    );
  }

  return (
    <EntityFormDialog<FulfillmentMappingValues>
      open
      onOpenChange={onOpenChange}
      title={mapping ? "Edit mapping" : "Add mapping"}
      description="How much of which inventory variant one unit of this product ships as."
      resolver={zodResolver(fulfillmentMappingSchema)}
      defaultValues={{
        invSkuId: mapping ? String(mapping.invSkuId) : "",
        quantityPerUnit: mapping ? String(Number(mapping.quantityPerUnit)) : "1",
        uom: mapping?.uom ?? "",
        notes: mapping?.notes ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending || update.isPending}
      submitLabel={mapping ? "Save changes" : "Add mapping"}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="invSkuId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory variant</FormLabel>
                <ProductVariantCombobox
                  value={field.value}
                  onChange={field.onChange}
                  disabled={mapping !== null}
                  ariaLabel="Inventory variant"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantityPerUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity per unit</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="decimal" className="tabular-nums" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of measure</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. each, box, kg" />
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
                  <Textarea {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
