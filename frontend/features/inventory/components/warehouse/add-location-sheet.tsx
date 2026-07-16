"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { useCreateLocation } from "@/hooks/api/inventory/warehouses";
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
  isLocationType,
} from "@/features/inventory/components/warehouse/location-type-constants";

const locationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(100),
  code: z.string().trim().min(1, "Location code is required").max(20),
  locationType: z.string().min(1, "Location type is required"),
  parentLocationId: z.string().optional(),
  isPickable: z.boolean(),
  isReceivable: z.boolean(),
  isSellable: z.boolean(),
  capacity: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationSchema>;

const defaultValues: LocationFormValues = {
  name: "",
  code: "",
  locationType: "ZONE",
  parentLocationId: "",
  isPickable: false,
  isReceivable: false,
  isSellable: false,
  capacity: "",
};

function getLocationTypeDefaults(
  type: string,
): Pick<LocationFormValues, "isPickable" | "isReceivable" | "isSellable"> {
  switch (type) {
    case "RECEIVING":
    case "RETURNS":
      return { isPickable: false, isReceivable: true, isSellable: false };
    case "SHIPPING":
      return { isPickable: true, isReceivable: false, isSellable: false };
    case "BIN":
    case "RACK":
      return { isPickable: true, isReceivable: true, isSellable: true };
    case "QUARANTINE":
    case "SCRAP":
      return { isPickable: false, isReceivable: false, isSellable: false };
    default:
      return { isPickable: false, isReceivable: false, isSellable: false };
  }
}

interface AddLocationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: number;
  warehouseName: string;
  locations: WarehouseLocation[];
}

export function AddLocationSheet({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
  locations,
}: AddLocationSheetProps) {
  const createLocation = useCreateLocation();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues,
  });

  const parentOptions = useMemo(
    () =>
      locations.filter(
        (l) =>
          l.locationType === "ZONE" ||
          l.locationType === "AISLE" ||
          l.locationType === "RACK",
      ),
    [locations],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    form.reset();
  }, [onOpenChange, form]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) form.reset();
      onOpenChange(nextOpen);
    },
    [onOpenChange, form],
  );

  const handleLocationTypeChange = useCallback(
    (v: string) => {
      form.setValue("locationType", v);
      const defaults = getLocationTypeDefaults(v);
      form.setValue("isPickable", defaults.isPickable);
      form.setValue("isReceivable", defaults.isReceivable);
      form.setValue("isSellable", defaults.isSellable);
    },
    [form],
  );

  const onSubmit = useCallback(
    (data: LocationFormValues) => {
      if (!isLocationType(data.locationType)) {
        toast.error("Invalid location type");
        return;
      }
      const capacityNum = data.capacity?.trim() ? Number(data.capacity.trim()) : undefined;
      createLocation.mutate(
        {
          warehouseId,
          name: data.name,
          code: data.code.toUpperCase(),
          locationType: data.locationType,
          parentLocationId: data.parentLocationId ? Number(data.parentLocationId) : undefined,
          isPickable: data.isPickable,
          isReceivable: data.isReceivable,
          isSellable: data.isSellable,
          capacity: capacityNum,
        },
        {
          onSuccess: () => {
            toast.success("Location added");
            handleClose();
          },
          onError: (err: unknown) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [warehouseId, createLocation, handleClose],
  );

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Add Location</SheetTitle>
          <SheetDescription>
            Add a zone, aisle, rack, or bin to {warehouseName}.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <SheetBody className="space-y-4 px-6 py-4">
            <FormField
              control={form.control}
              name="locationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Location Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={handleLocationTypeChange}>
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
                    <FormLabel className="text-[11px] font-medium cursor-pointer">Pickable</FormLabel>
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
                    <FormLabel className="text-[11px] font-medium cursor-pointer">Receivable</FormLabel>
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
                    <FormLabel className="text-[11px] font-medium cursor-pointer">Sellable</FormLabel>
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
                    <Input type="number" min="0" placeholder="Max units" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {parentOptions.length > 0 && (
              <FormField
                control={form.control}
                name="parentLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Location</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parentOptions.map((loc) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>
                            {loc.name} ({loc.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </SheetBody>
        </Form>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createLocation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={form.handleSubmit(onSubmit)}
              isPending={createLocation.isPending}
            >
              Add Location
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
