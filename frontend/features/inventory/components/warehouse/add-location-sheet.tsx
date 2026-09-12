"use client";

import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
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
import { isLocationType } from "@/features/inventory/components/warehouse/location-type-constants";
import { LocationFormFields } from "./location-form-fields";
import {
  LOCATION_FORM_DEFAULTS,
  getLocationTypeDefaults,
  locationFormSchema,
  type LocationFormValues,
} from "./location-form-schema";

export function parentCandidates(locations: WarehouseLocation[]): WarehouseLocation[] {
  return locations.filter(
    (l) => l.locationType === "ZONE" || l.locationType === "AISLE" || l.locationType === "RACK",
  );
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
    resolver: zodResolver(locationFormSchema),
    defaultValues: LOCATION_FORM_DEFAULTS,
  });

  const parentOptions = useMemo(() => parentCandidates(locations), [locations]);

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
      const capacity = data.capacity?.trim();
      createLocation.mutate(
        {
          warehouseId,
          name: data.name,
          code: data.code.toUpperCase(),
          locationType: data.locationType,
          ...(data.parentLocationId ? { parentLocationId: Number(data.parentLocationId) } : {}),
          isPickable: data.isPickable,
          isReceivable: data.isReceivable,
          isSellable: data.isSellable,
          ...(capacity ? { capacity } : {}),
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
            <LocationFormFields
              parentOptions={parentOptions}
              onLocationTypeChange={handleLocationTypeChange}
              allowNoParent
            />
          </SheetBody>
        </Form>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleClose} disabled={createLocation.isPending}>
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
