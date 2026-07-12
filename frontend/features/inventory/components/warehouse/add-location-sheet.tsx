"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { useCreateLocation } from "@/hooks/api/inventory/warehouses";
import type { LocationType, WarehouseLocation } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  LOCATION_TYPE_ORDER,
  LOCATION_TYPE_LABELS,
  isLocationType,
} from "@/features/inventory/components/warehouse/location-type-constants";

interface AddLocationFormState {
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId: string;
  isPickable: boolean;
  isReceivable: boolean;
  isSellable: boolean;
  capacity: string;
}

function blankForm(): AddLocationFormState {
  return {
    name: "",
    code: "",
    locationType: "ZONE",
    parentLocationId: "",
    isPickable: false,
    isReceivable: false,
    isSellable: false,
    capacity: "",
  };
}

function getLocationTypeDefaults(
  type: LocationType,
): Pick<AddLocationFormState, "isPickable" | "isReceivable" | "isSellable"> {
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
  const [form, setForm] = useState<AddLocationFormState>(blankForm());

  const setField = useCallback(
    <K extends keyof AddLocationFormState>(key: K, value: AddLocationFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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
    setForm(blankForm());
  }, [onOpenChange]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setForm(blankForm());
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleLocationTypeChange = useCallback(
    (v: string) => {
      if (!isLocationType(v)) return;
      setForm((prev) => ({ ...prev, locationType: v, ...getLocationTypeDefaults(v) }));
    },
    [],
  );

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value),
    [setField],
  );

  const handleCodeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("code", e.target.value),
    [setField],
  );

  const handleParentLocationChange = useCallback(
    (v: string) => setField("parentLocationId", v === "none" ? "" : v),
    [setField],
  );

  const handleIsPickableChange = useCallback(
    (v: boolean) => setField("isPickable", v),
    [setField],
  );

  const handleIsReceivableChange = useCallback(
    (v: boolean) => setField("isReceivable", v),
    [setField],
  );

  const handleIsSellableChange = useCallback(
    (v: boolean) => setField("isSellable", v),
    [setField],
  );

  const handleCapacityChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("capacity", e.target.value),
    [setField],
  );

  const handleSubmit = useCallback(() => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) {
      toast.error("Location name is required");
      return;
    }
    if (!code) {
      toast.error("Location code is required");
      return;
    }
    const capacityNum = form.capacity.trim() ? Number(form.capacity.trim()) : undefined;
    createLocation.mutate(
      {
        warehouseId,
        name,
        code,
        locationType: form.locationType,
        parentLocationId: form.parentLocationId ? Number(form.parentLocationId) : undefined,
        isPickable: form.isPickable,
        isReceivable: form.isReceivable,
        isSellable: form.isSellable,
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
  }, [form, warehouseId, createLocation, handleClose]);

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <SheetTitle>Add Location</SheetTitle>
          <SheetDescription>
            Add a zone, aisle, rack, or bin to {warehouseName}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc-type">
              Location Type <span className="text-destructive">*</span>
            </Label>
            <Select value={form.locationType} onValueChange={handleLocationTypeChange}>
              <SelectTrigger id="loc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPE_ORDER.map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {LOCATION_TYPE_LABELS[lt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-start gap-1 rounded-md border p-2">
              <Label className="text-[11px] font-medium cursor-pointer">Pickable</Label>
              <Switch checked={form.isPickable} onCheckedChange={handleIsPickableChange} />
            </div>
            <div className="flex flex-col items-start gap-1 rounded-md border p-2">
              <Label className="text-[11px] font-medium cursor-pointer">Receivable</Label>
              <Switch checked={form.isReceivable} onCheckedChange={handleIsReceivableChange} />
            </div>
            <div className="flex flex-col items-start gap-1 rounded-md border p-2">
              <Label className="text-[11px] font-medium cursor-pointer">Sellable</Label>
              <Switch checked={form.isSellable} onCheckedChange={handleIsSellableChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="loc-name"
              placeholder="Zone A"
              value={form.name}
              onChange={handleNameChange}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="loc-code"
              placeholder="ZA"
              value={form.code}
              onChange={handleCodeChange}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-capacity">Capacity (optional)</Label>
            <Input
              id="loc-capacity"
              type="number"
              min="0"
              placeholder="Max units"
              value={form.capacity}
              onChange={handleCapacityChange}
            />
          </div>
          {parentOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="loc-parent">Parent Location</Label>
              <Select
                value={form.parentLocationId || "none"}
                onValueChange={handleParentLocationChange}
              >
                <SelectTrigger id="loc-parent">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentOptions.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name} ({loc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createLocation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createLocation.isPending}>
              {createLocation.isPending ? "Adding…" : "Add Location"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
