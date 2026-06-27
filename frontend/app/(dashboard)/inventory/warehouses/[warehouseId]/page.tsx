"use client";

import { useState, useCallback, useMemo } from "react";
import { use } from "react";
import { motion } from "framer-motion";
import { Plus, MapPin, ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useWarehouse, useLocations, useCreateLocation } from "@/lib/api/hooks/inventory/warehouses";
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

const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  ZONE: "bg-violet-50 text-violet-700 border-violet-200/70",
  AISLE: "bg-blue-50 text-blue-700 border-blue-200/70",
  RACK: "bg-amber-50 text-amber-700 border-amber-200/70",
  BIN: "bg-green-50 text-green-700 border-green-200/70",
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
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 shrink-0",
            LOCATION_TYPE_COLORS[location.locationType],
          )}
        >
          {LOCATION_TYPE_LABELS[location.locationType]}
        </Badge>
        <span className="text-sm font-medium text-foreground truncate">{location.name}</span>
        <span className="text-xs text-muted-foreground font-mono shrink-0">{location.code}</span>
      </div>
      {!location.isActive && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
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

  const { data: warehouseData, isLoading: whLoading } = useWarehouse(warehouseId);
  const { data: locationsData, isLoading: locLoading } = useLocations(warehouseId);
  const createLocation = useCreateLocation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AddLocationFormState>({
    name: "",
    code: "",
    locationType: "ZONE",
    parentLocationId: "",
  });

  const warehouse = warehouseData;
  const locations = Array.isArray(locationsData) ? locationsData : [];

  const grouped = useMemo(() => groupByType(locations), [locations]);

  const parentOptions = useMemo(() => {
    return locations.filter(
      (l) =>
        l.locationType === "ZONE" ||
        l.locationType === "AISLE" ||
        l.locationType === "RACK",
    );
  }, [locations]);

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

  const handleSubmit = useCallback(() => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) { toast.error("Location name is required"); return; }
    if (!code) { toast.error("Location code is required"); return; }

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
  const cityLine = warehouse
    ? [warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(", ")
    : "";

  if (isLoading) {
    return (
      <PageWrapper title="Warehouse" eyebrow="Inventory / Warehouses">
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

  if (!warehouse) {
    return (
      <PageWrapper title="Warehouse not found" eyebrow="Inventory / Warehouses">
        <EmptyState
          title="Warehouse not found"
          description="This warehouse does not exist or you do not have access."
          action={{ label: "Back to Warehouses", href: "/inventory/warehouses" }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={warehouse.name}
      eyebrow="Inventory / Warehouses"
      subtitle={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{warehouse.code}</span>
          {cityLine && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {cityLine}
            </span>
          )}
          {warehouse.isDefault && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200/70">
              Default
            </Badge>
          )}
        </span>
      }
      badge={`${locations.length} locations`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/warehouses">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Location
          </Button>
        </div>
      }
    >
      {locations.length === 0 ? (
        <EmptyState
          illustration={
            <Layers className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          }
          title="No locations yet"
          description="Add zones, aisles, racks, and bins to organize stock within this warehouse."
          action={{ label: "Add Location", onClick: handleOpenSheet }}
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {LOCATION_TYPE_ORDER.map((lt) => {
            const items = grouped.get(lt) ?? [];
            if (items.length === 0) return null;
            return (
              <motion.div key={lt} variants={fadeUp}>
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          "text-[11px] px-2 py-0.5",
                          LOCATION_TYPE_COLORS[lt],
                        )}
                      >
                        {LOCATION_TYPE_LABELS[lt]}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
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
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Add Location</SheetTitle>
            <SheetDescription>
              Add a zone, aisle, rack, or bin to {warehouse.name}.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loc-type">Location Type <span className="text-destructive">*</span></Label>
              <Select
                value={form.locationType}
                onValueChange={(v) => setField("locationType", v as LocationType)}
              >
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
              <Label htmlFor="loc-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="loc-name"
                placeholder="Zone A"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-code">Code <span className="text-destructive">*</span></Label>
              <Input
                id="loc-code"
                placeholder="ZA"
                value={form.code}
                onChange={(e) => setField("code", e.target.value)}
                className="font-mono"
              />
            </div>
            {parentOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="loc-parent">Parent Location</Label>
                <Select
                  value={form.parentLocationId || "none"}
                  onValueChange={(v) => setField("parentLocationId", v === "none" ? "" : v)}
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
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              disabled={createLocation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createLocation.isPending}>
              {createLocation.isPending ? "Adding…" : "Add Location"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
