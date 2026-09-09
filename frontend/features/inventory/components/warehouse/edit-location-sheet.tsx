"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useUpdateLocation } from "@/hooks/api/inventory/warehouses";
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import { isLocationType } from "@/features/inventory/components/warehouse/location-type-constants";
import { parentCandidates } from "./add-location-sheet";
import { LocationFormFields } from "./location-form-fields";
import {
  getLocationTypeDefaults,
  locationEditSchema,
  type LocationEditValues,
} from "./location-form-schema";

export const LOCATION_MANAGE = "inventory:warehouses:manage";

interface EditLocationActionProps {
  location: WarehouseLocation;
  warehouseId: number;
  locations: WarehouseLocation[];
}

/**
 * `PATCH /inventory/warehouses/:warehouseId/locations/:locationId` had no
 * caller, so a bin created with the wrong code, the wrong flags or in the wrong
 * aisle stayed that way, and a location taken out of use could not be closed —
 * it kept being offered as a putaway destination for the life of the warehouse.
 */
export function EditLocationAction({
  location,
  warehouseId,
  locations,
}: EditLocationActionProps) {
  const canManage = useCan(LOCATION_MANAGE);
  const [open, setOpen] = useState(false);

  function handleOpen(): void {
    setOpen(true);
  }

  if (!canManage) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={handleOpen}
      >
        Edit
      </Button>
      {open ? (
        <EditLocationSheet
          open={open}
          onOpenChange={setOpen}
          location={location}
          warehouseId={warehouseId}
          locations={locations}
        />
      ) : null}
    </>
  );
}

interface EditLocationSheetProps extends EditLocationActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLocationSheet({
  open,
  onOpenChange,
  location,
  warehouseId,
  locations,
}: EditLocationSheetProps) {
  const updateLocation = useUpdateLocation();

  const form = useForm<LocationEditValues>({
    resolver: zodResolver(locationEditSchema),
    defaultValues: {
      name: location.name,
      code: location.code,
      locationType: location.locationType,
      parentLocationId: location.parentLocationId ? String(location.parentLocationId) : "",
      isPickable: location.isPickable,
      isReceivable: location.isReceivable,
      isSellable: location.isSellable,
      capacity: location.capacity ?? "",
      isActive: location.isActive,
    },
  });

  const parentOptions = useMemo(
    () => parentCandidates(locations).filter((candidate) => candidate.id !== location.id),
    [locations, location.id],
  );

  function handleClose(): void {
    onOpenChange(false);
  }

  function handleLocationTypeChange(value: string): void {
    form.setValue("locationType", value);
    const defaults = getLocationTypeDefaults(value);
    form.setValue("isPickable", defaults.isPickable);
    form.setValue("isReceivable", defaults.isReceivable);
    form.setValue("isSellable", defaults.isSellable);
  }

  function handleSubmit(data: LocationEditValues): void {
    if (!isLocationType(data.locationType)) {
      toast.error("Invalid location type");
      return;
    }
    const capacity = data.capacity?.trim();
    updateLocation.mutate(
      {
        warehouseId,
        locationId: location.id,
        name: data.name,
        code: data.code.toUpperCase(),
        locationType: data.locationType,
        ...(data.parentLocationId ? { parentLocationId: Number(data.parentLocationId) } : {}),
        isPickable: data.isPickable,
        isReceivable: data.isReceivable,
        isSellable: data.isSellable,
        ...(capacity ? { capacity } : {}),
        isActive: data.isActive,
      },
      {
        onSuccess: () => {
          toast.success("Location updated");
          handleClose();
        },
        onError: (error: unknown) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Edit Location</SheetTitle>
          <SheetDescription>
            {location.name} ({location.code})
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <SheetBody className="space-y-4 px-6 py-4">
            <LocationFormFields
              parentOptions={parentOptions}
              onLocationTypeChange={handleLocationTypeChange}
              allowNoParent={location.parentLocationId === null}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="rounded-md border border-border/70 px-3 py-2">
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        An inactive location stops being offered for putaway. It cannot be
                        switched off while stock is standing in it.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SheetBody>
        </Form>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleClose} disabled={updateLocation.isPending}>
              Cancel
            </Button>
            <LoadingButton
              onClick={form.handleSubmit(handleSubmit)}
              isPending={updateLocation.isPending}
            >
              Save changes
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
