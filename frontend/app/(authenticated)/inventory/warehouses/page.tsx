"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Plus, Warehouse, MapPin, Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWarehouses, useCreateWarehouse } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import Link from "next/link";

interface Warehouse {
  id: number;
  name: string;
  code: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isDefault: boolean;
  isActive: boolean;
  locations?: unknown[];
  _count?: { locations: number };
}

interface WarehouseFormState {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

function blankForm(): WarehouseFormState {
  return { name: "", code: "", address: "", city: "", state: "", country: "" };
}

function WarehouseCard({ warehouse }: { warehouse: Warehouse }) {
  const locationCount =
    warehouse._count?.locations ?? (Array.isArray(warehouse.locations) ? warehouse.locations.length : 0);
  const cityLine = [warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(", ");

  return (
    <motion.div variants={fadeUp}>
      <Link href={`/inventory/warehouses/${warehouse.id}`} className="block group">
        <Card className="cursor-pointer shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 group-focus-visible:ring-2 group-focus-visible:ring-ring">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Warehouse className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {warehouse.name}
                    </span>
                    {warehouse.isDefault && (
                      <Badge className="text-xs px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border-blue-200/70">
                        Default
                      </Badge>
                    )}
                    {!warehouse.isActive && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 rounded-md">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                    {warehouse.code}
                  </p>
                  {cityLine && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{cityLine}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {locationCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {locationCount === 1 ? "location" : "locations"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function WarehousesLoading() {
  return (
    <PageWrapper title="Warehouses" subtitle="Manage your storage facilities and locations">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-6 w-8 ml-auto" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}

export default function WarehousesPage() {
  const { data, isLoading, isError, refetch } = useWarehouses();
  const createMutation = useCreateWarehouse();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<WarehouseFormState>(blankForm());

  const warehouses = Array.isArray(data) ? data : [];

  const setField = useCallback(
    (key: keyof WarehouseFormState, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleOpenSheet = useCallback(() => {
    setForm(blankForm());
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSheetOpen(false);
      setForm(blankForm());
    }
  }, []);

  function handleRetry() { void refetch(); }

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("name", e.target.value);
  }, [setField]);

  const handleCodeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("code", e.target.value);
  }, [setField]);

  const handleAddressChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("address", e.target.value);
  }, [setField]);

  const handleCityChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("city", e.target.value);
  }, [setField]);

  const handleStateChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("state", e.target.value);
  }, [setField]);

  const handleCountryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("country", e.target.value);
  }, [setField]);

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(blankForm());
  }, []);

  const handleSubmit = useCallback(() => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) { toast.error("Warehouse name is required"); return; }
    if (!code) { toast.error("Warehouse code is required"); return; }

    createMutation.mutate(
      {
        name,
        code,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Warehouse created");
          setSheetOpen(false);
          setForm(blankForm());
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [form, createMutation]);

  if (isLoading) return <WarehousesLoading />;

  if (isError) {
    return (
      <PageWrapper title="Warehouses" subtitle="Manage your storage facilities and locations">
        <EmptyState
          illustration={<AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
          title="Failed to load warehouses"
          description="An error occurred while fetching warehouse data. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Warehouses"
      subtitle="Manage your storage facilities and locations"
      badge={String(warehouses.length)}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Warehouse
        </Button>
      }
    >
      {warehouses.length > 0 ? (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {warehouses.map((wh) => (
            <WarehouseCard key={wh.id} warehouse={wh} />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          illustration={
            <Building2 className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          }
          title="No warehouses yet"
          description="Add your first warehouse to start managing stock locations."
          action={{ label: "New Warehouse", onClick: handleOpenSheet }}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>New Warehouse</SheetTitle>
            <SheetDescription>
              Add a new storage facility to your organization.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="wh-name"
                placeholder="Main Warehouse"
                value={form.name}
                onChange={handleNameChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-code">Code <span className="text-destructive">*</span></Label>
              <Input
                id="wh-code"
                placeholder="WH-001"
                value={form.code}
                onChange={handleCodeChange}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-address">Address</Label>
              <Input
                id="wh-address"
                placeholder="123 Storage Lane"
                value={form.address}
                onChange={handleAddressChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wh-city">City</Label>
                <Input
                  id="wh-city"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={handleCityChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wh-state">State</Label>
                <Input
                  id="wh-state"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={handleStateChange}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-country">Country</Label>
              <Input
                id="wh-country"
                placeholder="India"
                value={form.country}
                onChange={handleCountryChange}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={handleCancelSheet}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Warehouse"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
