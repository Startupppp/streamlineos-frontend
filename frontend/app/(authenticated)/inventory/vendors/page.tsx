"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { VendorFormSheet } from "@/features/inventory/components/vendor-form-sheet";
import { useVendors } from "@/hooks/api/inventory";
import { useToggleVendorActive } from "@/hooks/api/inventory/vendors";
import type { InventoryVendor } from "@/types/inventory";

function VendorRowActions({ vendor }: { vendor: InventoryVendor }) {
  const toggleMutation = useToggleVendorActive();

  function handleToggleActive(): void {
    toggleMutation.mutate(
      { id: vendor.id, isActive: !vendor.isActive },
      {
        onSuccess: () => toast.success("Vendor status updated"),
        onError: (err: unknown) => {
          if (err instanceof Error && err.message.startsWith("409")) {
            toast.error("Cannot deactivate — vendor has open purchase orders.");
          } else {
            toast.error(getErrorMessage(err));
          }
        },
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Actions for ${vendor.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link href={`/inventory/vendors/${vendor.id}`}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleToggleActive}
          disabled={toggleMutation.isPending}
          className={!vendor.isActive ? "text-emerald-600" : "text-destructive"}
        >
          {vendor.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function VendorsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  const search = searchParams.get("search") ?? "";
  const activeParam = searchParams.get("isActive") ?? "all";

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

  function handleActiveChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("isActive");
    } else {
      params.set("isActive", value);
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

  const isActiveFilter =
    activeParam === "active" ? true : activeParam === "inactive" ? false : undefined;

  const query = useVendors({
    page: 1,
    limit: 100,
    search: search || undefined,
    isActive: isActiveFilter,
  });
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
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (v) => <VendorRowActions vendor={v} />,
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
      <Select value={activeParam} onValueChange={handleActiveChange}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="All vendors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All vendors</SelectItem>
          <SelectItem value="active">Active only</SelectItem>
          <SelectItem value="inactive">Inactive only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Vendors"
      subtitle={
        query.data
          ? `${total} ${total === 1 ? "vendor" : "vendors"}`
          : "Suppliers for inventory purchase orders."
      }
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
              description={
                search
                  ? "No results match your search."
                  : "Add a supplier to start creating purchase orders."
              }
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
