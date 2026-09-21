"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { EmptyProductsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { UomCreateForm } from "@/features/inventory/components/uom-create-form";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useUom } from "@/hooks/api/inventory";
import type { InventoryUom } from "@/types/inventory";

const uomColumns: DataTableColumn<InventoryUom>[] = [
  {
    key: "name",
    header: "Name",
    cell: (uom) => (
      <span className="font-medium text-foreground">{uom.name}</span>
    ),
  },
  {
    key: "abbreviation",
    header: "Abbreviation",
    headerClassName: "w-[120px]",
    cell: (uom) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {uom.abbreviation}
      </span>
    ),
  },
  {
    key: "category",
    header: "Category",
    headerClassName: "w-[120px]",
    cell: (uom) => (
      <span className="text-muted-foreground">{uom.category ?? "—"}</span>
    ),
  },
  {
    key: "ratioToBase",
    header: "Ratio",
    headerClassName: "w-[100px] text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (uom) => (uom.ratioToBase ? `${uom.ratioToBase}:1` : "—"),
  },
  {
    key: "isBase",
    header: "Base?",
    headerClassName: "w-[70px] text-center",
    className: "text-center",
    cell: (uom) =>
      uom.isBase ? (
        <Badge
          variant="outline"
          className="h-4 text-micro px-1.5 py-0 border-status-success-rule text-status-success-ink bg-status-success-surface"
        >
          Yes
        </Badge>
      ) : (
        <span className="text-micro text-muted-foreground">—</span>
      ),
  },
];

function UomPageInner() {
  const canCreate = useCan("inventory:products:create");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState<number>(0);

  const statusParam = searchParams.get("status") ?? "all";
  const [search, setSearch] = useState<string>(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useUom();
  const pageState = usePageState({
    permission: "inventory:products:read",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  });
  const uomList = query.data ?? [];

  const filteredUom = uomList.filter((uom) => {
    const term = debouncedSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      uom.name.toLowerCase().includes(term) ||
      uom.abbreviation.toLowerCase().includes(term);
    const matchesStatus =
      statusParam === "all" ||
      (statusParam === "active" && uom.isActive) ||
      (statusParam === "inactive" && !uom.isActive);
    return matchesSearch && matchesStatus;
  });

  const updateParams = useCallback((updates: Record<string, string | null>): void => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed !== current) {
      updateParams({ search: trimmed });
    }
  }, [debouncedSearch, updateParams, searchParams]);

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value });
  }

  function handleFormSuccess(): void {
    setFormKey((k) => k + 1);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper
        title="Units of Measure"
        subtitle="Define units used across product catalogues and transactions."
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  const hasFilters = !!(
    search.trim() || (statusParam && statusParam !== "all")
  );

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <SearchInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search units..."
      />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "w-[140px] text-xs")}
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Units of Measure"
      subtitle="Define units used across product catalogues and transactions."
      filters={filtersRow}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {canCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Add Unit of Measure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UomCreateForm key={formKey} onSuccess={handleFormSuccess} />
            </CardContent>
          </Card>
        )}

          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={filteredUom}
                getRowKey={(uom) => uom.id}
                isLoading={query.isLoading}
                className="flex-1 min-h-0"
                emptyState={
                  <InventoryEmptyState
                    illustration={
                      hasFilters ? (
                        <EmptySearchIllustration />
                      ) : (
                        <EmptyProductsIllustration />
                      )
                    }
                    title={
                      hasFilters ? "No units found" : "No units of measure yet"
                    }
                    description={
                      hasFilters
                        ? "Try adjusting your search or filters."
                        : "Use the form above to add your first unit."
                    }
                    className="border-0 bg-transparent"
                  />
                }
                columns={uomColumns}
                minWidth="480px"
              />
            </CardContent>
          </Card>
      </div>
    </PageWrapper>
  );
}

export default function UomPage() {
  return (
    <Suspense>
      <UomPageInner />
    </Suspense>
  );
}
