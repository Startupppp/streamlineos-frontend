"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  EmptyCompaniesIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { VendorFormSheet } from "@/features/inventory/components/vendor-form-sheet";
import { useVendors } from "@/hooks/api/inventory";
import { useToggleVendorActive } from "@/hooks/api/inventory/vendors";
import type { InventoryVendor } from "@/types/inventory";

function VendorRowActions({ vendor }: { vendor: InventoryVendor }) {
  const toggleMutation = useToggleVendorActive();
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } =
    useAnimatedIcon();

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
          {...ellipsisHover}
        >
          <EllipsisIcon ref={ellipsisRef} size={14} />
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
          variant={vendor.isActive ? "destructive" : "default"}
          className={!vendor.isActive ? "text-emerald-600" : undefined}
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
  const { iconRef: plusRef, hoverHandlers: plusHover } = useAnimatedIcon();
  const [page, setPage] = useState<number>(() => {
    const p = Number(searchParams.get("page"));
    return p > 0 ? p : 1;
  });

  const [search, setSearch] = useState<string>(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(search, 300);
  const activeParam = searchParams.get("isActive") ?? "all";

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleActiveChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("isActive");
    } else {
      params.set("isActive", value);
    }
    params.delete("page");
    setPage(1);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  function handlePageChange(newPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    setPage(newPage);
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
    activeParam === "active"
      ? true
      : activeParam === "inactive"
        ? false
        : undefined;

  const query = useVendors({
    page,
    limit: 20,
    search: debouncedSearch.trim() || undefined,
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
      cell: (v) => (
        <span className="font-mono tabular-nums">{v.leadTimeDays} days</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "paymentTermsDays",
      header: "Payment terms",
      cell: (v) => (
        <span className="font-mono tabular-nums">Net {v.paymentTermsDays}</span>
      ),
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

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("search", trimmed);
    else params.delete("search");
    params.delete("page");
    setPage(1);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }, [debouncedSearch]);

  return (
    <PageWrapper
      eyebrow="Inventory"
      title="Vendors"
      subtitle="Manage your suppliers and purchase order vendors."
      badge={query.data ? `${total}` : undefined}
      actions={
        <Button size="sm" onClick={handleNewVendor} {...plusHover}>
          <PlusIcon ref={plusRef} size={14} className="mr-1" />
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
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total,
          onPageChange: handlePageChange,
        }}
        emptyState={
          query.error ? (
            <ErrorState
              description={query.error.message}
              onRetry={handleRetry}
              compact
            />
          ) : (
            <InventoryEmptyState
              illustration={
                search ? (
                  <EmptySearchIllustration />
                ) : (
                  <EmptyCompaniesIllustration />
                )
              }
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
