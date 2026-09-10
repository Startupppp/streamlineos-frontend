"use client";

import { useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { EntityFormSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSetKitBom,
  type KitComponent,
} from "@/hooks/api/inventory/stock-types-dock";
import {
  kitBomFormSchema,
  type KitBomFormOutput,
  type KitBomFormValues,
} from "./kit-bom-schema";

interface KitBomEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kitVariantId: number;
  components: KitComponent[];
}

/**
 * Saying what a kit is made of.
 *
 * The kits page could read a bill of materials and never write one, and its own
 * empty state said "Set them on the product, then come back" — pointing at a
 * screen that does not exist. `PUT /inventory/kits/:kitVariantId/bom` was
 * mounted, carried `inventory:products:update`, and `useSetKitBom` was
 * referenced by nothing, so every kit in the product was one somebody had put
 * into the database by hand.
 *
 * The route replaces the whole list rather than merging, and its schema says
 * why: "these are the components" is what somebody editing a kit means, and a
 * partial merge would need a stable line identity they do not have in front of
 * them. So this is a sheet over the entire list, seeded from what is there —
 * rung 4, because it is a repeating multi-row form, not a field.
 *
 * An empty list is a legitimate save. The schema's own comment calls it "how a
 * kit stops being a kit", so the form permits it rather than enforcing a
 * minimum the server does not have.
 */
export function KitBomEditorSheet({
  open,
  onOpenChange,
  kitVariantId,
  components,
}: KitBomEditorSheetProps) {
  const setBom = useSetKitBom();

  function handleSubmit(values: KitBomFormOutput): void {
    setBom.mutate(
      {
        kitVariantId,
        components: values.components.map((line) => ({
          componentVariantId: Number(line.componentVariantId),
          quantityPer: line.quantityPer,
        })),
      },
      {
        onSuccess: (saved) => {
          toast.success(
            saved.length === 0
              ? "Bill of materials cleared — this SKU is no longer a kit."
              : `Bill of materials saved with ${String(saved.length)} component${saved.length === 1 ? "" : "s"}.`,
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormSheet<KitBomFormValues, KitBomFormOutput>
      open={open}
      onOpenChange={onOpenChange}
      title="Bill of materials"
      description="What one of this kit is made of. Saving replaces the whole list; an empty list stops it being a kit."
      resolver={zodResolver(kitBomFormSchema)}
      resetOnOpen
      className="sm:max-w-2xl"
      defaultValues={{
        components: components.map((component) => ({
          componentVariantId: String(component.componentVariantId),
          quantityPer: component.quantityPer,
        })),
      }}
      isSubmitting={setBom.isPending}
      submitLabel={setBom.isPending ? "Saving…" : "Save bill of materials"}
      onSubmit={handleSubmit}
    >
      {(form) => <KitBomFields form={form} />}
    </EntityFormSheet>
  );
}

type FormApi = Parameters<
  Parameters<typeof EntityFormSheet<KitBomFormValues, KitBomFormOutput>>[0]["children"]
>[0];

function KitBomFields({ form }: { form: FormApi }) {
  const components = useFieldArray({ control: form.control, name: "components" });

  function handleAddComponent(): void {
    components.append({ componentVariantId: "", quantityPer: "1" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Components</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddComponent}>
          Add component
        </Button>
      </div>

      {components.fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No components. Saving now clears the bill of materials, and this SKU stops being a
          kit.
        </p>
      ) : null}

      {components.fields.map((componentField, index) => (
        <div key={componentField.id} className="rounded-xl border border-border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem]">
            <FormField
              control={form.control}
              name={`components.${index}.componentVariantId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component</FormLabel>
                  <FormControl>
                    <ProductVariantCombobox
                      value={field.value}
                      onChange={field.onChange}
                      ariaLabel={`Component ${String(index + 1)}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`components.${index}.quantityPer`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Per kit</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7"
            onClick={() => components.remove(index)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}
