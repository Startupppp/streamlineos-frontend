"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings2, ClipboardList } from "lucide-react";
import { ShoppingCartIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
import { useInventoryInsights } from "@/hooks/api/inventory/ai";
import { GeneratePODialog } from "./generate-po-dialog";
import { ReorderProposalPanel } from "./reorder-proposal-panel";
import { SupplierDelayBriefing } from "./supplier-delay-briefing";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildColumns(
  selectedIds: Set<number>,
  expandedId: number | null,
  handleToggle: (id: number) => void,
  handleExpand: (id: number) => void,
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
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label={`Select ${row.productName}`}
        />
      ),
    },
    {
      key: "productName",
      header: "Product / SKU",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-dense font-medium" />
          <p className="text-dense text-muted-foreground font-mono">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row) => <TruncatedText text={row.warehouseName ?? ""} className="text-dense text-muted-foreground" />,
    },
    {
      key: "currentStock",
      header: "Current Stock",
      className: "tabular-nums text-dense",
      cell: (row) => row.currentStock,
    },
    {
      key: "minQty",
      header: "Min Qty",
      className: "tabular-nums text-dense",
      cell: (row) => row.minQty,
    },
    {
      key: "suggestedQty",
      header: "Suggested Qty",
      className: "tabular-nums text-dense font-semibold text-primary",
      cell: (row) => row.suggestedQty,
    },
    {
      key: "vendorName",
      header: "Vendor",
      cell: (row) => <TruncatedText text={row.vendorName ?? "—"} className="text-dense text-muted-foreground" />,
    },
    {
      key: "expectedDate",
      header: "Expected Date",
      cell: (row) => <span className="text-dense text-muted-foreground">{formatDate(row.expectedDate)}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <TruncatedText text={row.reason} className="text-dense text-muted-foreground max-w-[160px]" />
      ),
    },
    {
      key: "aiExplain",
      header: "",
      className: "w-28",
      cell: (row) => {
        const isExpanded = expandedId === row.id;
        return (
          <ExpandAiButton rowId={row.id} isExpanded={isExpanded} onExpand={handleExpand} />
        );
      },
    },
  ];
}

interface ExpandAiButtonProps {
  rowId: number;
  isExpanded: boolean;
  onExpand: (id: number) => void;
}

function ExpandAiButton({ rowId, isExpanded, onExpand }: ExpandAiButtonProps) {
  return (
    <Button
      variant={isExpanded ? "secondary" : "ghost"}
      size="sm"
      className="h-6 text-micro px-2 gap-1"
      onClick={() => onExpand(rowId)}
    >
      AI Explain
    </Button>
  );
}

export function ReplenishmentClient() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useReplenishmentSuggestions({ page });
  const generatePO = useGeneratePO();
  const canCreatePO = useCan("inventory:purchase-orders:create");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: insightsData } = useInventoryInsights({ type: "vendor_delay", limit: 1 });
  const hasVendorDelayInsights = (insightsData?.total ?? 0) > 0;

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

  const handleExpand = useCallback(function handleExpand(id: number): void {
    setExpandedId((prev) => (prev === id ? null : id));
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
        suggestions: items
          .filter((s): s is typeof s & { warehouseId: number } => s.warehouseId !== null)
          .map((s) => ({
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

  const expandedSuggestion = expandedId !== null
    ? suggestions.find((s) => s.id === expandedId) ?? null
    : null;

  const columns = buildColumns(selectedIds, expandedId, handleToggle, handleExpand);

  const selectAllToolbar = suggestions.length > 0 ? (
    <Button variant="ghost" size="sm" className="text-xs" onClick={handleSelectAll}>
      {allSelected ? "Deselect all" : "Select all"}
    </Button>
  ) : undefined;

  return (
    <PageWrapper
      title="Replenishment"
      subtitle="Review suggestions and create draft purchase orders."
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <AnimatedIconButton
              icon={ShoppingCartIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleCreateDraftPO}
              disabled={!canCreatePO || generatePO.isPending}
            >
              Create Draft PO ({selectedIds.size})
            </AnimatedIconButton>
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
          <DataTable
            data={suggestions}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="900px"
            toolbar={selectAllToolbar}
            pagination={{
              mode: "server",
              page,
              pageSize: 50,
              total: data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        )}

        {expandedSuggestion && (
          <ReorderProposalPanel
            variantId={String(expandedSuggestion.variantId)}
            variantName={expandedSuggestion.productName}
            warehouseId={expandedSuggestion.warehouseId !== null ? String(expandedSuggestion.warehouseId) : undefined}
          />
        )}

        {hasVendorDelayInsights && (
          <SupplierDelayBriefing />
        )}
      </div>

      <GeneratePODialog
        suggestions={selectedSuggestions}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </PageWrapper>
  );
}
