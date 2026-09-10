"use client";

import { type Control } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
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
import { MATERIAL_FAMILIES } from "@/features/inventory/lib/new-product-schema";
import type { ProductFormValues } from "@/features/inventory/lib/new-product-schema";
import { useInventoryPacks } from "@/hooks/api/inventory/admin";

/**
 * B1 — the eight things a materials buyer selects on, plus the two the buyer
 * needs to raise an order.
 *
 * Rendered only while the `materials` pack is on. That is not cosmetic: with the
 * pack off the server strips these keys from every response and refuses them on
 * every write, so a form that showed them would be collecting data the
 * organisation can never see.
 *
 * None of these is a variant axis. Two grades of cement are two products with
 * two reorder points; two finishes of the same tile are two SKUs a picker must
 * not confuse. Variants stay for genuine size/colour splits of one item.
 */
export function ProductMaterialFields({ control }: { control: Control<ProductFormValues> }) {
  const { data: packs, isLoading } = useInventoryPacks();

  // Nothing while the answer is unknown: flashing the section in and out is
  // worse than a beat of nothing, and a half-filled section that vanishes on
  // load loses what somebody typed.
  if (isLoading || !packs?.materials) return null;

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-sm font-semibold text-foreground">Material details</h2>
      <p className="mb-4 text-dense text-muted-foreground">
        What a buyer asks for at the counter — brand, grade, finish, size — and what a buyer needs
        to raise the next order.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="brand"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="UltraTech" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="materialFamily"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Material family</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a family" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MATERIAL_FAMILIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Groups the catalogue for reordering and substitution.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="materialGrade"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Grade</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="OPC 53 · Fe500D · BWP 710" />
              </FormControl>
              <FormDescription>The strength or class printed on the bag or bar.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="dimensionLabel"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Dimensions</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="600 x 600 mm" />
              </FormControl>
              <FormDescription>As the trade writes it, so a picker can match the carton.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="finish"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Finish</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Glossy · Matt · Polished" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="colour"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Colour</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Statuario White" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="packSize"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Units per pack</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="4" />
              </FormControl>
              <FormDescription>Tiles in a box, bags on a pallet. Leave empty if not packed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="supplierCode"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Supplier code</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="KAJ-VIT-600-STW" />
              </FormControl>
              <FormDescription>What appears on the supplier&apos;s invoice.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="leadTimeDays"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Lead time (days)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} inputMode="numeric" placeholder="7" />
              </FormControl>
              <FormDescription>Order to arrival. Drives the at-risk warning on a site.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="reorderQuantity"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel>Reorder quantity</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} inputMode="decimal" placeholder="300" />
              </FormControl>
              <FormDescription>
                How much to buy when the reorder point is crossed. Without it, a suggestion only
                proposes the bare deficit and fires again tomorrow.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Card>
  );
}
