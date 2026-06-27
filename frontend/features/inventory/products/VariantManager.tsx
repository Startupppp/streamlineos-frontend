"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2, Save, Trash2, ChevronRight } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppSheet } from "@/components/shared/app-sheet";
import { toast } from "sonner";
import { useCreateProductVariant } from "@/lib/api/hooks/inventory";
import type { InventoryProductVariant } from "@/types/inventory";

const attributeEntrySchema = z.object({
  key: z.string().min(1, "Attribute name required"),
  value: z.string().min(1, "Value required"),
});

const numberFieldSchema = z
  .string()
  .refine(
    (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Must be 0 or more",
  );

const variantFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  costPrice: numberFieldSchema,
  sellingPrice: numberFieldSchema,
  attributes: z.array(attributeEntrySchema),
});

type VariantFormInput = z.input<typeof variantFormSchema>;
type VariantFormValues = z.infer<typeof variantFormSchema>;

interface VariantManagerProps {
  productId: number;
  variants: InventoryProductVariant[];
}

function VariantRow({ variant }: { variant: InventoryProductVariant }) {
  const attrs = variant.attributeValues
    ? Object.entries(variant.attributeValues)
    : [];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{variant.name}</p>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{variant.sku}</p>
      </div>
      {attrs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attrs.map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-xs">
              {k}: {v}
            </Badge>
          ))}
        </div>
      )}
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">Cost</p>
        <p className="font-medium">₹{Number(variant.costPrice).toLocaleString("en-IN")}</p>
      </div>
    </div>
  );
}

function AttributeFields({
  attributes,
  onAdd,
  onRemove,
  onChange,
}: {
  attributes: { key: string; value: string }[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onChange: (idx: number, field: "key" | "value", value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Attribute Values</p>
      {attributes.map((attr, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <Input
            placeholder="e.g. Color"
            value={attr.key}
            onChange={(e) => onChange(idx, "key", e.target.value)}
            className="flex-1"
            aria-label={`Attribute name ${idx + 1}`}
          />
          <Input
            placeholder="e.g. Red"
            value={attr.value}
            onChange={(e) => onChange(idx, "value", e.target.value)}
            className="flex-1"
            aria-label={`Attribute value ${idx + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(idx)}
            aria-label={`Remove attribute ${idx + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Attribute
      </Button>
    </div>
  );
}

export function VariantManager({ productId, variants }: VariantManagerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const createVariant = useCreateProductVariant(productId);

  const form = useForm<VariantFormInput, unknown, VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      costPrice: "",
      sellingPrice: "",
      attributes: [],
    },
  });

  const attributes = form.watch("attributes");

  function handleAddAttribute() {
    form.setValue("attributes", [...(attributes ?? []), { key: "", value: "" }]);
  }

  function handleRemoveAttribute(idx: number) {
    form.setValue(
      "attributes",
      (attributes ?? []).filter((_, i) => i !== idx),
    );
  }

  function handleAttributeChange(idx: number, field: "key" | "value", value: string) {
    const updated = (attributes ?? []).map((a, i) =>
      i === idx ? { ...a, [field]: value } : a,
    );
    form.setValue("attributes", updated);
  }

  function handleOpenSheet() {
    form.reset({
      name: "",
      sku: "",
      costPrice: "",
      sellingPrice: "",
      attributes: [],
    });
    setSheetOpen(true);
  }

  function handleSubmit(values: VariantFormValues) {
    const attributeValues =
      values.attributes.length > 0
        ? Object.fromEntries(values.attributes.map(({ key, value }) => [key, value]))
        : undefined;

    createVariant.mutate(
      {
        name: values.name,
        sku: values.sku,
        costPrice: Number(values.costPrice),
        sellingPrice: Number(values.sellingPrice),
        attributeValues,
      },
      {
        onSuccess: () => {
          toast.success("Variant added");
          setSheetOpen(false);
        },
        onError: () => toast.error("Failed to add variant"),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Variants{" "}
          <span className="text-muted-foreground font-normal">({variants.length})</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">No variants yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click &ldquo;Add Variant&rdquo; to create the first one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {variants.map((v) => (
            <VariantRow key={v.id} variant={v} />
          ))}
        </div>
      )}

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Add Variant"
        description="Create a new product variant with its own SKU and pricing."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={createVariant.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="variant-form"
              disabled={createVariant.isPending}
            >
              {createVariant.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Variant
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id="variant-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Variant Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Red / Large" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    SKU <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. STL-ROD-12-RED-L" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <AttributeFields
              attributes={attributes ?? []}
              onAdd={handleAddAttribute}
              onRemove={handleRemoveAttribute}
              onChange={handleAttributeChange}
            />
          </form>
        </Form>
      </AppSheet>
    </div>
  );
}
