"use client";

import { useState } from "react";
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
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReplenishmentSuggestions,
  useGeneratePO,
  type GeneratePOInput,
  type ReplenishmentSuggestion,
} from "@/hooks/api/inventory/planning";
import { useInventoryInsights } from "@/hooks/api/inventory/ai";
import { GeneratePODialog } from "./generate-po-dialog";
import { ForecastProposalSheet } from "./forecast-proposal-sheet";
import { ReorderProposalPanel } from "./reorder-proposal-panel";
import { SupplierDelayBriefing } from "./supplier-delay-briefing";
import { formatQuantity } from "./forecast-format";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface RowActionsProps {
  row: ReplenishmentSuggestion;
  isExpanded: boolean;
  onOpenProposal: (row: ReplenishmentSuggestion) => void;
  onExpandAi: (id: number) => void;
}

function RowActions({ row, isExpanded, onOpenProposal, onExpandAi }: RowActionsProps) {
  function handleProposal(): void {
    onOpenProposal(row);
  }

  function handleAi(): void {
    onExpandAi(row.id);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="outline" size="sm" className="h-7 px-2 text-micro" onClick={handleProposal}>
        Proposal
      </Button>
      <Button
        variant={isExpanded ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2 text-micro"
        onClick={handleAi}
      >
        AI Explain
      </Button>
    </div>
  );
}

function buildColumns(
  expandedId: number | null,
  onOpenProposal: (row: ReplenishmentSuggestion) => void,
  onExpandAi: (id: number) => void,
): DataTableColumn<ReplenishmentSuggestion>[] {
  return [
    {
      key: "productName",
      header: "Product / SKU",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-dense font-medium" />
          <p className="font-mono text-dense text-muted-foreground">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (row) => (
        <TruncatedText
          text={row.warehouseName ?? "—"}
          className="text-dense text-muted-foreground"
        />
      ),
    },
    {
      key: "currentStock",
      header: "Current Stock",
      className: "font-mono tabular-nums text-dense text-right",
      headerClassName: "text-right",
      cell: (row) => formatQuantity(row.currentStock),
    },
    {
      key: "suggestedQty",
      header: "Policy Qty",
      className: "font-mono tabular-nums text-dense text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => formatQuantity(row.suggestedQty),
    },
    {
      key: "expectedDate",
      header: "Expected Date",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{formatDate(row.expectedDate)}</span>
      ),
    },
    {
      key: "reason",
      header: "Rule Trigger",
      cell: (row) => (
        <TruncatedText text={row.reason} className="max-w-[180px] text-dense text-muted-foreground" />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-40",
      cell: (row) => (
        <RowActions
          row={row}
          isExpanded={expandedId === row.id}
          onOpenProposal={onOpenProposal}
          onExpandAi={onExpandAi}
        />
      ),
    },
  ];
}

function toGeneratePoInput(
  vendorId: number,
  items: ReplenishmentSuggestion[],
): GeneratePOInput {
  return {
    vendorId,
    suggestions: items.map((item) => ({
      productVariantId: item.variantId,
      suggestedQty: item.suggestedQty,
    })),
  };
}

export function ReplenishmentClient() {
  const [page, setPage] = useState(1);
  const canReadSuggestions = useCan("inventory:reports:read");
  const canCreatePO = useCan("inventory:purchase-orders:create");
  const { data, isLoading, error, refetch } = useReplenishmentSuggestions({ page });
  const generatePO = useGeneratePO();

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [proposalRow, setProposalRow] = useState<ReplenishmentSuggestion | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);

  const { data: insightsData } = useInventoryInsights({ type: "vendor_delay", limit: 1 });
  const hasVendorDelayInsights = (insightsData?.total ?? 0) > 0;

  const suggestions = data?.items ?? [];

  function handleExpandAi(id: number): void {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleOpenProposal(row: ReplenishmentSuggestion): void {
    setProposalRow(row);
    setProposalOpen(true);
  }

  function handleCreateDraftPO(): void {
    const selected = suggestions.filter((s) => selectedIds.has(String(s.id)));
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
      generatePO.mutate(toGeneratePoInput(vendorId, items), {
        onSuccess: (result) => {
          toast.success("Draft PO created", {
            description: `PO ${result.poNumber} created from the min/max policy.`,
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

  const selectedSuggestions = suggestions.filter((s) => selectedIds.has(String(s.id)));
  const expandedSuggestion =
    expandedId !== null ? (suggestions.find((s) => s.id === expandedId) ?? null) : null;

  const columns = buildColumns(expandedId, handleOpenProposal, handleExpandAi);

  return (
    <PageWrapper
      title="Replenishment"
      subtitle="Min/max policy overrides. Open a row's proposal for what the forecast engine recommends and the evidence behind it."
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
              PO from policy ({selectedIds.size})
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
        {!canReadSuggestions ? (
          <NoPermissionState
            permission="inventory:reports:read"
            title="Replenishment is restricted"
            description="Reading replenishment suggestions needs inventory report access. This list is not empty — it is closed to you."
            className="flex-1"
          />
        ) : (
          <>
            {isLoading ? null : error ? (
              <ErrorState onRetry={handleRetry} />
            ) : suggestions.length === 0 ? (
              <InventoryEmptyState
                illustrationPreset="inventory"
                title="No policy triggers"
                description="No min/max rule is currently breached. The forecast engine can still be asked about any SKU from the forecasting screen."
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
                selection={{ selected: selectedIds, onChange: setSelectedIds }}
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
                warehouseId={
                  expandedSuggestion.warehouseId !== null
                    ? String(expandedSuggestion.warehouseId)
                    : undefined
                }
              />
            )}

            {hasVendorDelayInsights && <SupplierDelayBriefing />}
          </>
        )}
      </div>

      <ForecastProposalSheet
        key={proposalRow?.variantId ?? "none"}
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        productVariantId={proposalRow?.variantId ?? null}
        productName={proposalRow?.productName ?? ""}
        variantSku={proposalRow?.variantSku ?? ""}
        vendorId={proposalRow?.vendorId ?? null}
        warehouseId={proposalRow?.warehouseId ?? null}
      />

      <GeneratePODialog
        suggestions={selectedSuggestions}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </PageWrapper>
  );
}
