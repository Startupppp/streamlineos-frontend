"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings2, ShoppingCart, ClipboardList } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReplenishmentSuggestions,
  useGeneratePO,
  type ReplenishmentSuggestion,
  type GeneratePOInput,
} from "@/hooks/api/inventory/planning";
import { GeneratePODialog } from "./generate-po-dialog";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildColumns(
  selectedIds: Set<number>,
  handleToggle: (id: number) => void,
): DataTableColumn<ReplenishmentSuggestion>[] {
  return [
    {
      key: "select",
      header: "",
      className: "w-8",
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => handleToggle(row.id)}
          className="h-4 w-4 rounded border-border accent-blue-500 cursor-pointer"
          aria-label={`Select ${row.productName}`}
        />
      ),
    },
    {
      key: "productName",
      header: "Product / SKU",
      cell: (row) => (
        <div>
          <p className="text-[11px] font-medium truncate max-w-[180px]">{row.productName}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row) => <span className="text-[11px] text-muted-foreground">{row.warehouseName}</span>,
    },
    {
      key: "currentStock",
      header: "Current Stock",
      className: "tabular-nums text-[11px]",
      cell: (row) => row.currentStock,
    },
    {
      key: "minQty",
      header: "Min Qty",
      className: "tabular-nums text-[11px]",
      cell: (row) => row.minQty,
    },
    {
      key: "suggestedQty",
      header: "Suggested Qty",
      className: "tabular-nums text-[11px] font-semibold text-blue-600",
      cell: (row) => row.suggestedQty,
    },
    {
      key: "vendorName",
      header: "Vendor",
      cell: (row) => <span className="text-[11px] text-muted-foreground">{row.vendorName ?? "—"}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected Date",
      cell: (row) => <span className="text-[11px] text-muted-foreground">{formatDate(row.expectedDate)}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-[160px] truncate",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
  ];
}

export function ReplenishmentClient() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useReplenishmentSuggestions({ page });
  const generatePO = useGeneratePO();
  const canCreatePO = useCan("inventory:purchase-orders:create");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestions = data?.items ?? [];

  const handleToggle = useCallback(function handleToggle(id: number): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  function handleSelectAll(): void {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.id)));
    }
  }

  function handleCreateDraftPO(): void {
    const selected = suggestions.filter((s) => selectedIds.has(s.id));
    const vendorGroups = new Map<number, ReplenishmentSuggestion[]>();
    for (const s of selected) {
      if (s.vendorId === null) continue;
      const existing = vendorGroups.get(s.vendorId);
      if (existing) {
        existing.push(s);
      } else {
        vendorGroups.set(s.vendorId, [s]);
      }
    }

    if (vendorGroups.size === 0) {
      toast.error("No vendor assigned", {
        description: "Selected items have no vendor assigned.",
      });
      return;
    }

    if (vendorGroups.size === 1) {
      const [[vendorId, items]] = vendorGroups.entries();
      const input: GeneratePOInput = {
        vendorId,
        suggestions: items.map((s) => ({
          variantId: s.variantId,
          warehouseId: s.warehouseId,
          qty: s.suggestedQty,
        })),
      };
      generatePO.mutate(input, {
        onSuccess: (result) => {
          toast.success("Draft PO created", {
            description: `PO #${result.purchaseOrderNumber} created successfully.`,
          });
          setSelectedIds(new Set());
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      });
      return;
    }

    setDialogOpen(true);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleDialogClose(): void {
    setDialogOpen(false);
    setSelectedIds(new Set());
  }

  const selectedSuggestions = suggestions.filter((s) => selectedIds.has(s.id));
  const allSelected = suggestions.length > 0 && selectedIds.size === suggestions.length;

  const columns = buildColumns(selectedIds, handleToggle);

  const selectAllToolbar = suggestions.length > 0 ? (
    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSelectAll}>
      {allSelected ? "Deselect all" : "Select all"}
    </Button>
  ) : undefined;

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Replenishment"
      subtitle="Review suggestions and create draft purchase orders."
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleCreateDraftPO}
              disabled={!canCreatePO || generatePO.isPending}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Create Draft PO ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/reports/reorder">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Reorder Report
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/replenishment/rules">
              <Settings2 className="h-4 w-4 mr-1.5" />
              Manage Rules
            </Link>
          </Button>
        </div>
      }
    >
      {isLoading ? null : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : suggestions.length === 0 ? (
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="No replenishment needed"
          description="All stock levels are above minimum thresholds."
          className="flex-1 h-full"
        />
      ) : null}

      {!error && (isLoading || suggestions.length > 0) && (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={suggestions}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              minWidth="760px"
              toolbar={selectAllToolbar}
              pagination={{
                mode: "server",
                page,
                pageSize: 50,
                total: data?.total ?? 0,
                onPageChange: setPage,
              }}
            />
          </CardContent>
        </Card>
      )}

      <GeneratePODialog
        suggestions={selectedSuggestions}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </PageWrapper>
  );
}
