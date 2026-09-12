"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import {
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
} from "@/features/inventory/components/warehouse/location-type-constants";
import type { LocationFormValues } from "./location-form-schema";

interface LocationFormFieldsProps {
  parentOptions: WarehouseLocation[];
  onLocationTypeChange: (value: string) => void;
  /**
   * `updateLocationSchema` takes `parentLocationId` as a positive integer with
   * no null, so a parent can be changed but never removed. Offering None to a
   * location that has one would be a control that silently does nothing.
   */
  allowNoParent: boolean;
}

/**
 * Reads the form off `FormProvider` rather than taking it as a prop: the edit
 * sheet's values carry one field more than the add sheet's, and a prop typed to
 * either one would have forced a cast at the other call site.
 */
export function LocationFormFields({
  parentOptions,
  onLocationTypeChange,
  allowNoParent,
}: LocationFormFieldsProps) {
  const form = useFormContext<LocationFormValues>();

  function handleParentChange(value: string): void {
    form.setValue("parentLocationId", value === "none" ? "" : value);
  }

  return (
    <>
      <FormField
        control={form.control}
        name="locationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Location Type <span className="text-destructive">*</span>
            </FormLabel>
            <Select value={field.value} onValueChange={onLocationTypeChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {LOCATION_TYPE_ORDER.map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {LOCATION_TYPE_LABELS[lt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-3 gap-2">
        <FormField
          control={form.control}
          name="isPickable"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start gap-1 rounded-md border p-2">
              <FormLabel className="text-dense font-medium cursor-pointer">Pickable</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isReceivable"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start gap-1 rounded-md border p-2">
              <FormLabel className="text-dense font-medium cursor-pointer">Receivable</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isSellable"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start gap-1 rounded-md border p-2">
              <FormLabel className="text-dense font-medium cursor-pointer">Sellable</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Zone A" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Code <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="ZA" className="font-mono" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Capacity (optional)</FormLabel>
            <FormControl>
              <Input inputMode="decimal" placeholder="Max units" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {parentOptions.length > 0 ? (
        <FormField
          control={form.control}
          name="parentLocationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Location</FormLabel>
              <Select value={field.value || "none"} onValueChange={handleParentChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowNoParent ? <SelectItem value="none">None</SelectItem> : null}
                  {parentOptions.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name} ({loc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allowNoParent ? null : (
                <FormDescription>
                  A parent can be moved to another zone, aisle or rack, but not removed.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}
