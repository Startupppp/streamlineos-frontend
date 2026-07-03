"use client";

import { useState, useCallback, useMemo, use, type ChangeEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, MapPin } from "lucide-react";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWarehouse, useLocations, useCreateLocation } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

type LocationType = "ZONE" | "AISLE" | "RACK" | "BIN";

interface Location {
  id: number;
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId?: number | null;
  isActive: boolean;
  children?: Location[];
}

interface AddLocationFormState {
  name: string;
  code: string;
  locationType: LocationType;
  parentLocationId: string;
}

const LOCATION_TYPE_ORDER: LocationType[] = ["ZONE", "AISLE", "RACK", "BIN"];

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  ZONE: "Zone",
  AISLE: "Aisle",
  RACK: "Rack",
  BIN: "Bin",
};

function isLocationType(val: string): val is LocationType {
  return val in LOCATION_TYPE_LABELS;
}

const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  ZONE: "bg-violet-50 text-violet-700 border-violet-200/70",
  AISLE: "bg-blue-50 text-blue-700 border-blue-200/70",
  RACK: "bg-amber-50 text-amber-700 border-amber-200/70",
  BIN: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
};

function groupByType(locations: Location[]): Map<LocationType, Location[]> {
  const map = new Map<LocationType, Location[]>();
  for (const lt of LOCATION_TYPE_ORDER) {
    map.set(lt, []);
  }
  for (const loc of locations) {
    const arr = map.get(loc.locationType);
    if (arr) arr.push(loc);
  }
  return map;
}

function LocationRow({ location }: { location: Location }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] px-1.5 py-0 h-4 shrink-0",
            LOCATION_TYPE_COLORS[location.locationType],
          )}
        >
          {LOCATION_TYPE_LABELS[location.locationType]}
        </Badge>
        <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
        <span className="text-[11px] text-muted-foreground font-mono shrink-0">{location.code}</span>
      </div>
      {!location.isActive && (
        <Badge
          variant="outline"
          className="h-4 text-[9px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200 shrink-0"
        >
          Inactive
        </Badge>
      )}
    </div>
  );
}

export default function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId: warehouseIdStr } = use(params);
  const warehouseId = Number(warehouseIdStr);
  const shouldReduceMotion = useReducedMotion();

  const {
    data: warehouseData,
    isLoading: whLoading,
    isError: whError,
    refetch: refetchWarehouse,
  } = useWarehouse(warehouseId);
  const {
    data: locationsData,
    isLoading: locLoading,
    isError: locError,
    refetch: refetchLocations,
  } = useLocations(warehouseId);
  const createLocation = useCreateLocation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AddLocationFormState>({
    name: "",
    code: "",
    locationType: "ZONE",
    parentLocationId: "",
  });

  const warehouse = warehouseData;
  const locations = useMemo(
    () => (Array.isArray(locationsData) ? locationsData : []),
    [locationsData],
  );
  const grouped = useMemo(() => groupByType(locations), [locations]);

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

  const setField = useCallback(
    <K extends keyof AddLocationFormState>(key: K, value: AddLocationFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleOpenSheet = useCallback(() => {
    setForm({ name: "", code: "", locationType: "ZONE", parentLocationId: "" });
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSheetOpen(false);
      setForm({ name: "", code: "", locationType: "ZONE", parentLocationId: "" });
    }
  }, []);

  function handleRetry() {
    void refetchWarehouse();
    void refetchLocations();
  }

  const handleLocationTypeChange = useCallback(
    (v: string) => {
      if (isLocationType(v)) setField("locationType", v);
    },
    [setField],
  );

  const handleLocationNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value),
    [setField],
  );

  const handleLocationCodeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("code", e.target.value),
    [setField],
  );

  const handleParentLocationChange = useCallback(
    (v: string) => setField("parentLocationId", v === "none" ? "" : v),
    [setField],
  );

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    setForm({ name: "", code: "", locationType: "ZONE", parentLocationId: "" });
  }, []);

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
    createLocation.mutate(
      {
        warehouseId,
        name,
        code,
        locationType: form.locationType,
        parentLocationId: form.parentLocationId ? Number(form.parentLocationId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Location added");
          setSheetOpen(false);
          setForm({ name: "", code: "", locationType: "ZONE", parentLocationId: "" });
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [form, warehouseId, createLocation]);

  const isLoading = whLoading || locLoading;
  const isError = whError || locError;

  if (isLoading) {
    return (
      <PageWrapper
        title="Warehouse"
        eyebrow="Operations · Inventory"
        backHref="/inventory/warehouses"
      >
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-56" />
              </div>
            </CardContent>
          </Card>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-9 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Warehouse"
        eyebrow="Operations · Inventory"
        backHref="/inventory/warehouses"
      >
        <ErrorState
          title="Failed to load warehouse"
          description="An error occurred while fetching warehouse data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!warehouse) {
    return (
      <PageWrapper
        title="Warehouse not found"
        eyebrow="Operations · Inventory"
        backHref="/inventory/warehouses"
      >
        <EmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="Warehouse not found"
          description="This warehouse does not exist or you do not have access."
          action={{ label: "Back to Warehouses", href: "/inventory/warehouses" }}
        />
      </PageWrapper>
    );
  }

  const cityLine = [warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(", ");

  return (
    <PageWrapper
      title={warehouse.name}
      eyebrow="Operations · Inventory"
      backHref="/inventory/warehouses"
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {warehouse.code}
          </span>
          {cityLine && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {cityLine}
            </span>
          )}
          {warehouse.isDefault && (
            <Badge
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
            >
              Default
            </Badge>
          )}
        </span>
      }
      badge={`${locations.length} location${locations.length !== 1 ? "s" : ""}`}
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Location
        </Button>
      }
    >
      {locations.length === 0 ? (
        <EmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="No locations yet"
          description="Add zones, aisles, racks, and bins to organize stock within this warehouse."
          action={{ label: "Add Location", onClick: handleOpenSheet }}
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={shouldReduceMotion ? undefined : staggerContainer}
          initial={shouldReduceMotion ? undefined : "hidden"}
          animate={shouldReduceMotion ? undefined : "visible"}
        >
          {LOCATION_TYPE_ORDER.map((lt) => {
            const items = grouped.get(lt) ?? [];
            if (items.length === 0) return null;
            return (
              <motion.div
                key={lt}
                variants={shouldReduceMotion ? undefined : fadeUp}
              >
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] h-4 px-1.5 py-0", LOCATION_TYPE_COLORS[lt])}
                      >
                        {LOCATION_TYPE_LABELS[lt]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {items.length} {items.length === 1 ? "location" : "locations"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="divide-y divide-border/50">
                      {items.map((loc) => (
                        <LocationRow key={loc.id} location={loc} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>Add Location</SheetTitle>
            <SheetDescription>
              Add a zone, aisle, rack, or bin to {warehouse.name}.
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
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-name"
                placeholder="Zone A"
                value={form.name}
                onChange={handleLocationNameChange}
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
                onChange={handleLocationCodeChange}
                className="font-mono"
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
                onClick={handleCancelSheet}
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
    </PageWrapper>
  );
}
