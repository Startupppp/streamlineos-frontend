"use client";

import { useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { useCategories } from "@/hooks/api/inventory/products";
import { useLocations, useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_ORDER,
} from "@/features/inventory/components/warehouse/location-type-constants";
import {
  ANY_LOCATION_TYPE,
  SLOTTING_MATCH_TYPES,
  SLOTTING_MATCH_TYPE_LABEL,
  VELOCITY_CLASSES,
  VELOCITY_CLASS_LABEL,
  type SlottingRuleFormValues,
} from "./slotting-rule-schema";

interface SlottingRuleFormFieldsProps {
  form: UseFormReturn<SlottingRuleFormValues>;
}

/**
 * A rule points at a container, never at a leaf.
 *
 * `SlottingService.slotFor` expands the target to its whole subtree, and its own
 * header gives the reason: "a rule that names bins is wrong the moment one of
 * them is full". So the three container types are offered and a bin is not.
 */
const TARGET_TYPES = new Set(["ZONE", "AISLE", "RACK"]);

export function SlottingRuleFormFields({ form }: SlottingRuleFormFieldsProps) {
  const warehousesQuery = useWarehouses({ status: "active" });
  const categoriesQuery = useCategories();

  const warehouseId = form.watch("warehouseId");
  const matchType = form.watch("matchType");

  const locationsQuery = useLocations(Number(warehouseId) || 0);

  const zoneOptions = useMemo(
    () =>
      (locationsQuery.data ?? []).filter(
        (location) => location.isActive && TARGET_TYPES.has(location.locationType),
      ),
    [locationsQuery.data],
  );

  /**
   * Switching the match type clears the other two payloads rather than leaving
   * them to be stripped later. The server refuses a rule carrying two, and a
   * planner who tried a category, changed their mind and picked a class would
   * otherwise be told their category was wrong.
   */
  const handleMatchTypeChange = useCallback(
    (value: string) => {
      if (value !== "VELOCITY_CLASS" && value !== "CATEGORY" && value !== "PRODUCT_VARIANT") return;
      form.setValue("matchType", value, { shouldValidate: false });
      if (value !== "VELOCITY_CLASS") form.setValue("velocityClass", "");
      if (value !== "CATEGORY") form.setValue("categoryId", "");
      if (value !== "PRODUCT_VARIANT") form.setValue("productVariantId", "");
      form.clearErrors(["velocityClass", "categoryId", "productVariantId"]);
    },
    [form],
  );

  /** A zone belongs to one building, so changing building retires the choice. */
  const handleWarehouseChange = useCallback(
    (value: string) => {
      form.setValue("warehouseId", value, { shouldValidate: false });
      form.setValue("targetZoneLocationId", "");
      form.clearErrors("targetZoneLocationId");
    },
    [form],
  );

  const zonePlaceholder = !warehouseId
    ? "Choose a warehouse first"
    : locationsQuery.isLoading
      ? "Loading locations…"
      : zoneOptions.length === 0
        ? "This warehouse has no zones, aisles or racks"
        : "Choose a zone";

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="warehouseId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Warehouse</FormLabel>
            <Select value={field.value} onValueChange={handleWarehouseChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      warehousesQuery.isLoading ? "Loading warehouses…" : "Choose a warehouse"
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {(warehousesQuery.data ?? []).map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.name}
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
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Fast movers to the gold zone" {...field} />
            </FormControl>
            <FormDescription>
              What a supervisor will read in the rule list months from now.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="matchType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Matches</FormLabel>
            <Select value={field.value} onValueChange={handleMatchTypeChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {SLOTTING_MATCH_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SLOTTING_MATCH_TYPE_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Velocity is recomputed from the ledger, so a class rule keeps following the SKUs that
              actually move.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {matchType === "VELOCITY_CLASS" ? (
        <FormField
          control={form.control}
          name="velocityClass"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Velocity class</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {VELOCITY_CLASSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {VELOCITY_CLASS_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {matchType === "CATEGORY" ? (
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        categoriesQuery.isLoading ? "Loading categories…" : "Choose a category"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {(categoriesQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {matchType === "PRODUCT_VARIANT" ? (
        <FormField
          control={form.control}
          name="productVariantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variant</FormLabel>
              <FormControl>
                <ProductVariantCombobox value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={form.control}
        name="targetZoneLocationId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sends to</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={zoneOptions.length === 0}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={zonePlaceholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {zoneOptions.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.name} · {location.code} ·{" "}
                    {LOCATION_TYPE_LABELS[location.locationType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Putaway expands this to everything underneath it, so a rule survives a full bin.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="targetLocationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Narrow to</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  <SelectItem value={ANY_LOCATION_TYPE}>Anything under it</SelectItem>
                  {LOCATION_TYPE_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>
                      {LOCATION_TYPE_LABELS[option]} only
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
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <Input inputMode="numeric" className="font-mono tabular-nums" {...field} />
              </FormControl>
              <FormDescription>Lowest number wins when two rules match.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
