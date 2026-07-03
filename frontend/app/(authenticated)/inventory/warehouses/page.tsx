"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { ErrorState } from "@/components/shared";
import { toast } from "sonner";
import { staggerContainer } from "@/lib/motion-variants";
import { useWarehouses, useCreateWarehouse } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { WarehouseCard } from "@/features/inventory/components/warehouse-card";

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

function WarehousesLoading() {
  return (
    <PageWrapper eyebrow="Operations · Inventory" title="Warehouses">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<WarehouseFormState>(blankForm());

  const warehouses = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const searchValue = searchParams.get("q") ?? "";
  const statusValue = searchParams.get("status") ?? "all";

  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase();
    return warehouses.filter((wh) => {
      const matchesSearch =
        !q || wh.name.toLowerCase().includes(q) || wh.code.toLowerCase().includes(q);
      const matchesStatus =
        statusValue === "all" ||
        (statusValue === "active" && wh.isActive) ||
        (statusValue === "inactive" && !wh.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [warehouses, searchValue, statusValue]);

  const hasActiveFilters = searchValue.length > 0 || statusValue !== "all";

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (e.target.value) {
        params.set("q", e.target.value);
      } else {
        params.delete("q");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("status");
      } else {
        params.set("status", value);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const clearFilters = useCallback(() => {
    router.replace("?", { scroll: false });
  }, [router]);

  const setField = useCallback((key: keyof WarehouseFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

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

  function handleRetry() {
    void refetch();
  }

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value),
    [setField],
  );
  const handleCodeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("code", e.target.value),
    [setField],
  );
  const handleAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("address", e.target.value),
    [setField],
  );
  const handleCityChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("city", e.target.value),
    [setField],
  );
  const handleStateChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("state", e.target.value),
    [setField],
  );
  const handleCountryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setField("country", e.target.value),
    [setField],
  );

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(blankForm());
  }, []);

  const handleSubmit = useCallback(() => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    if (!name) {
      toast.error("Warehouse name is required");
      return;
    }
    if (!code) {
      toast.error("Warehouse code is required");
      return;
    }
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

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          className="h-8 w-full min-w-0 pl-8 text-xs"
          placeholder="Search warehouses…"
          value={searchValue}
          onChange={handleSearchChange}
          aria-label="Search warehouses"
        />
      </div>
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (isLoading) return <WarehousesLoading />;

  if (isError) {
    return (
      <PageWrapper eyebrow="Operations · Inventory" title="Warehouses" filters={filterBar}>
        <ErrorState
          title="Failed to load warehouses"
          description="An error occurred while fetching warehouse data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Warehouses"
      subtitle={`${filtered.length} ${filtered.length === 1 ? "warehouse" : "warehouses"}`}
      badge={String(warehouses.length)}
      filters={filterBar}
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Warehouse
        </Button>
      }
    >
      {filtered.length > 0 ? (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          {...(shouldReduceMotion
            ? {}
            : { variants: staggerContainer, initial: "hidden", animate: "visible" })}
        >
          {filtered.map((wh) => (
            <WarehouseCard key={wh.id} warehouse={wh} />
          ))}
        </motion.div>
      ) : hasActiveFilters ? (
        <EmptyState
          title="No warehouses found"
          description="No warehouses match your current filters."
          action={{ label: "Clear filters", onClick: clearFilters }}
        />
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
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>New Warehouse</SheetTitle>
            <SheetDescription>Add a new storage facility to your organization.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wh-name"
                placeholder="Main Warehouse"
                value={form.name}
                onChange={handleNameChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-code">
                Code <span className="text-destructive">*</span>
              </Label>
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
          <SheetFooter className="shrink-0 px-6 py-4 border-t">
            <div className="grid w-full grid-cols-2 gap-2">
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
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
