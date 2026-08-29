"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Filter } from "lucide-react";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  EmptyWarehouseIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { staggerContainer } from "@/lib/motion-variants";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useWarehouses,
} from "@/hooks/api/inventory/warehouses";
import type { WarehouseListFilters } from "@/hooks/api/inventory/warehouses";
import { WarehouseCard } from "@/features/inventory/components/warehouse-card";
import { WarehouseCreateSheet } from "@/features/inventory/components/warehouse/warehouse-create-sheet";
import { useCan } from "@/hooks/api/access";

export default function WarehousesPage() {
  const canView = useCan("inventory:warehouses:read");
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const statusValue = (searchParams.get("status") ??
    "all") as WarehouseListFilters["status"];
  const isDefaultFilter = searchParams.get("isDefault");
  const countryFilter = searchParams.get("country") ?? "";
  const cityFilter = searchParams.get("city") ?? "";

  const [localSearch, setLocalSearch] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(localSearch, 350);

  const filters = useMemo<WarehouseListFilters>(
    () => ({
      q: debouncedSearch || undefined,
      status: statusValue !== "all" ? statusValue : undefined,
      isDefault:
        isDefaultFilter === "true"
          ? true
          : isDefaultFilter === "false"
            ? false
            : undefined,
      country: countryFilter || undefined,
      city: cityFilter || undefined,
    }),
    [debouncedSearch, statusValue, isDefaultFilter, countryFilter, cityFilter],
  );

  const { data, isLoading, isError, refetch } = useWarehouses(filters);

  const warehouses = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasActiveFilters =
    !!localSearch.trim() ||
    statusValue !== "all" ||
    !!isDefaultFilter ||
    !!countryFilter ||
    !!cityFilter;

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setParam("q", localSearch || undefined);
      }
    },
    [localSearch, setParam],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? undefined;
    const next = debouncedSearch || undefined;
    if (next !== current) setParam("q", next);
  }, [debouncedSearch, setParam, searchParams]);

  const handleStatusChange = useCallback(
    (value: string) => setParam("status", value),
    [setParam],
  );

  const handleIsDefaultChange = useCallback(
    (value: string) =>
      setParam("isDefault", value === "all" ? undefined : value),
    [setParam],
  );

  const clearFilters = useCallback(() => {
    setLocalSearch("");
    router.replace("?", { scroll: false });
  }, [router]);

  const handleOpenSheet = useCallback(() => {
    setSheetOpen(true);
  }, []);

  function handleRetry(): void {
    void refetch();
  }

  function handleToggleFilters(): void {
    setShowFilters((prev) => !prev);
  }

  function handleClearSearch(): void {
    setLocalSearch("");
    setParam("q", undefined);
  }

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <SearchInput className="min-w-0 flex-1"
        placeholder="Search by name, code, city, country…"
        value={localSearch}
        onValueChange={handleSearchChange}
        onClear={handleClearSearch}
        onKeyDown={handleSearchKeyDown}
        aria-label="Search warehouses"
      />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px] text-xs")}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleToggleFilters}
          aria-expanded={showFilters}
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          Filters
        </Button>
      </div>
      {hasActiveFilters && (
        <AnimatedIconButton icon={XIcon} iconSize={12} iconClassName="mr-0.5" variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
          Clear
        </AnimatedIconButton>
      )}
    </div>
  );

  if (!canView)
    return (
      <PageWrapper
        title="Warehouses"
        subtitle="Physical storage facilities and their locations"
      >
        <NoPermissionState permission="inventory:warehouses:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Warehouses"
      subtitle="Physical storage facilities and their locations"
      filters={filterBar}
      actions={
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" className="text-xs" onClick={handleOpenSheet}>
          New Warehouse
        </AnimatedIconButton>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isLoading ? null : isError ? (
          <ErrorState
            title="Failed to load warehouses"
            description="An error occurred while fetching warehouse data. Please try again."
            onRetry={handleRetry}
          />
        ) : (
          <>
            {showFilters && (
              <div className="mb-4 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
                <Select
                  value={isDefaultFilter ?? "all"}
                  onValueChange={handleIsDefaultChange}
                >
                  <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] text-xs")}>
                    <SelectValue placeholder="Default status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any default status</SelectItem>
                    <SelectItem value="true">Default warehouse</SelectItem>
                    <SelectItem value="false">Non-default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {warehouses.length > 0 ? (
              <motion.div
                className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                variants={shouldReduceMotion ? undefined : staggerContainer}
                initial={shouldReduceMotion ? undefined : "hidden"}
                animate={shouldReduceMotion ? undefined : "visible"}
              >
                {warehouses.map((wh) => (
                  <WarehouseCard key={wh.id} warehouse={wh} />
                ))}
              </motion.div>
            ) : hasActiveFilters ? (
              <InventoryEmptyState
                illustration={<EmptySearchIllustration />}
                title="No warehouses found"
                description="No warehouses match your current filters."
                action={{ label: "Clear filters", onClick: clearFilters }}
                className={CONTENT_FILL_PANEL}
              />
            ) : (
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title="No warehouses yet"
                description="Add your first warehouse to start managing stock locations."
                action={{ label: "New Warehouse", onClick: handleOpenSheet }}
                className={CONTENT_FILL_PANEL}
              />
            )}
          </>
        )}
      </div>

      <WarehouseCreateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
