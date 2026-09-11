"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EntityFormSheet } from "@/components/shared";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useAddRequirement } from "@/hooks/api/inventory/projects";

const schema = z.object({
  productVariantId: z.coerce.number().int().positive("Choose the material this site needs"),
  warehouseId: z.string().optional(),
  requiredQty: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "Enter a quantity with up to 4 decimal places")
    .refine((v) => Number(v) > 0, "The quantity has to be more than zero"),
  requiredBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
});

type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

/**
 * "Add Material" on a site.
 *
 * The store list is ordered so the ones serving this site's own zone come first:
 * a site is nearly always served from a facility in its own zone, and making
 * somebody scan the whole list to find it is the small friction that gets a
 * line raised against the wrong store.
 */
export function RequirementAddSheet({
  projectId,
  projectZone,
}: {
  projectId: number;
  projectZone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const canManage = useCan("inventory:projects:manage");
  const add = useAddRequirement();
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const { data: variants, isLoading: variantsLoading } = useProductVariants({ activeOnly: true });
  const { data: warehouses } = useWarehouses({ status: "active" });

  const sortedStores = useMemo(() => {
    const list = warehouses ?? [];
    if (!projectZone) return list;
    return [...list].sort((a, b) => {
      const az = a.zone === projectZone ? 0 : 1;
      const bz = b.zone === projectZone ? 0 : 1;
      return az - bz || a.name.localeCompare(b.name);
    });
  }, [warehouses, projectZone]);

  if (!canManage) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        {...hoverHandlers}
      >
        <PlusIcon ref={iconRef} size={14} aria-hidden="true" />
        Add Material
      </button>

      <EntityFormSheet<Values, Output>
        open={open}
        onOpenChange={setOpen}
        title="Add material to this site"
        description="A requirement records what the site needs and when. Stock is not held until somebody presses Reserve Stock."
        resolver={zodResolver(schema)}
        resetOnOpen
        defaultValues={{ productVariantId: 0, requiredQty: "" }}
        isSubmitting={add.isPending}
        submitLabel={add.isPending ? "Adding…" : "Add Requirement"}
        onSubmit={(values) => {
          add.mutate(
            {
              projectId,
              productVariantId: values.productVariantId,
              warehouseId: values.warehouseId ? Number(values.warehouseId) : null,
              requiredQty: values.requiredQty,
              requiredBy: values.requiredBy || null,
              notes: values.notes || null,
            },
            {
              onSuccess: () => {
                toast.success("Material added to the site");
                setOpen(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        {(form) => (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="productVariantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ""}
                    disabled={variantsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={variantsLoading ? "Loading catalogue…" : "Choose a product"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(variants ?? []).map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.productName} — {v.name} ({v.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="requiredQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity needed</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiredBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Needed by</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Served from</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Decide later" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedStores.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-dense text-muted-foreground">
                    Leave this unset while the store is undecided — the requirement is still real.
                  </p>
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
                    <Textarea {...field} value={field.value ?? ""} rows={2} placeholder="Ground floor lobby" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </EntityFormSheet>
    </>
  );
}
