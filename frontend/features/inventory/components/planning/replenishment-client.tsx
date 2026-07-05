"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings2, ShoppingCart } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable, ErrorState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
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

interface SuggestionRowProps {
  suggestion: ReplenishmentSuggestion;
  selected: boolean;
  onToggle: (id: number) => void;
}

function SuggestionRow({ suggestion: s, selected, onToggle }: SuggestionRowProps) {
  function handleToggle(): void {
    onToggle(s.id);
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={handleToggle}
          className="h-4 w-4 rounded border-border accent-blue-500 cursor-pointer"
          aria-label={`Select ${s.productName}`}
        />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{s.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{s.variantSku}</p>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{s.warehouseName}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{s.currentStock}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{s.minQty}</td>
      <td className="px-4 py-3 text-sm font-semibold tabular-nums text-blue-600">{s.suggestedQty}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{s.vendorName ?? "—"}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(s.expectedDate)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate" title={s.reason}>
        {s.reason}
      </td>
    </tr>
  );
}

export function ReplenishmentClient() {
  const { data, isLoading, error, refetch } = useReplenishmentSuggestions();
  const generatePO = useGeneratePO();
  const canCreatePO = useCan("inventory:purchase-orders:create");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const suggestions = data ?? [];

  function handleToggle(id: number): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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
        onError: () => {
          toast.error("Failed to create PO");
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
            <Link href="/inventory/replenishment/rules">
              <Settings2 className="h-4 w-4 mr-1.5" />
              Manage Rules
            </Link>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={6} columns={9} />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : suggestions.length === 0 ? (
        <EmptyState
          illustrationPreset="inventory"
          title="No replenishment needed"
          description="All stock levels are above minimum thresholds."
          className="flex-1 h-full"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-border accent-blue-500 cursor-pointer"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Product / SKU</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Warehouse</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Current Stock</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Min Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Suggested Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Expected Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <SuggestionRow
                    key={s.id}
                    suggestion={s}
                    selected={selectedIds.has(s.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GeneratePODialog
        suggestions={selectedSuggestions}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </PageWrapper>
  );
}
