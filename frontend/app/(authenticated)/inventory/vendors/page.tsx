"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { VendorFormSheet } from "@/features/inventory/components/vendor-form-sheet";
import { useVendors } from "@/hooks/api/inventory";
import type { InventoryVendor } from "@/types/inventory";

export default function VendorsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  const search = searchParams.get("search") ?? "";

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("search", e.target.value);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handleNewVendor(): void {
    setSheetOpen(true);
  }

  function handleClearSearch(): void {
    router.replace("?", { scroll: false });
  }

  const query = useVendors({ page: 1, limit: 100, search: search || undefined });
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  function handleRetry(): void {
    void query.refetch();
  }

  const columns: DataTableColumn<InventoryVendor>[] = [
    {
      key: "name",
      header: "Name",
      cell: (v) => (
        <Link
          href={`/inventory/vendors/${v.id}`}
          className="font-medium text-blue-600 hover:underline transition-colors"
        >
          {v.name}
        </Link>
      ),
      sortable: true,
      sortValue: (v) => v.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (v) => <span className="font-mono text-[11px]">{v.code}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (v) => v.email ?? "—",
    },
    {
      key: "leadTimeDays",
      header: "Lead time",
      cell: (v) => <span className="font-mono tabular-nums">{v.leadTimeDays} days</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "paymentTermsDays",
      header: "Payment terms",
      cell: (v) => <span className="font-mono tabular-nums">Net {v.paymentTermsDays}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => (
        <Badge
          variant="outline"
          className={cn(
            "h-4 text-[9px] px-1.5 py-0",
            v.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-700 border-slate-200",
          )}
        >
          {v.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search vendors…"
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Vendors"
      subtitle={query.data ? `${total} ${total === 1 ? "vendor" : "vendors"}` : "Suppliers for inventory purchase orders."}
      actions={
        <Button size="sm" onClick={handleNewVendor}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New vendor
        </Button>
      }
      filters={filterBar}
    >
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(v) => v.id}
        isLoading={query.isLoading}
        emptyState={
          query.error ? (
            <ErrorState description={query.error.message} onRetry={handleRetry} compact />
          ) : (
            <EmptyState
              title={search ? "No vendors found" : "No vendors yet"}
              description={search ? "No results match your search." : "Add a supplier to start creating purchase orders."}
              action={
                search
                  ? { label: "Clear search", onClick: handleClearSearch }
                  : { label: "New vendor", onClick: handleNewVendor }
              }
              compact
            />
          )
        }
        minWidth="640px"
        className="min-h-[320px]"
      />

      <VendorFormSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
