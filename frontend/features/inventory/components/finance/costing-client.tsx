"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCostingProducts, type CostingVariant } from "@/hooks/api/inventory/valuation";
import { COSTING_METHOD_BADGE_CLASS, costingMethodLabel } from "./costing-method";

const PAGE_SIZE = 20;
const ACTIVE_ONLY = "active";
const ALL_VARIANTS = "all";

const METHOD_EXPLANATIONS: { method: string; description: string }[] = [
  {
    method: "FIFO",
    description: "First In, First Out — the oldest layer is drawn down first when goods leave.",
  },
  {
    method: "WEIGHTED_AVERAGE",
    description: "Running weighted average cost, recalculated after each receipt.",
  },
  {
    method: "STANDARD",
    description: "A fixed cost per unit; the difference against actual cost is a variance.",
  },
];

function CostingGuidanceCard() {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Costing Methods
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {METHOD_EXPLANATIONS.map((m) => (
            <div key={m.method} className="space-y-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-dense font-medium ${COSTING_METHOD_BADGE_CLASS[m.method] ?? "bg-muted text-muted-foreground border-border"}`}
              >
                {costingMethodLabel(m.method)}
              </span>
              <p className="text-xs text-muted-foreground leading-snug">{m.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildColumns(display: MoneyDisplay): DataTableColumn<CostingVariant>[] {
  return [
    {
      key: "product",
      header: "Product / SKU",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-sm font-medium text-foreground" />
          <p className="text-xs text-muted-foreground font-mono">{row.sku}</p>
        </div>
      ),
    },
    {
      key: "variant",
      header: "Variant",
      cell: (row) => (
        <TruncatedText text={row.name} className="text-sm text-muted-foreground" />
      ),
    },
    {
      key: "costPrice",
      header: "Cost Price",
      className: "tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) =>
        row.costPrice === undefined ? "—" : formatMoney(row.costPrice, display),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className="h-4 text-micro px-1.5 py-0">
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];
}

export function CostingClient() {
  const canView = useCan("inventory:valuation:read");
  const display = useOrgDisplay();
  const [scope, setScope] = useState(ACTIVE_ONLY);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useCostingProducts({
    activeOnly: scope === ACTIVE_ONLY,
    page,
    limit: PAGE_SIZE,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const columns = buildColumns(display);

  function handleScopeChange(value: string): void {
    setScope(value);
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  if (!canView)
    return (
      <PageWrapper
        title="Costing Setup"
        subtitle="The cost price each variant carries, and the costing methods valuation runs on."
      >
        <NoPermissionState permission="inventory:valuation:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Costing Setup"
      subtitle="The cost price each variant carries, and the costing methods valuation runs on."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory/valuation">View Valuation</Link>
        </Button>
      }
      filters={
        <Select value={scope} onValueChange={handleScopeChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-48 text-sm")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ACTIVE_ONLY}>Active variants</SelectItem>
            <SelectItem value={ALL_VARIANTS}>All variants</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <CostingGuidanceCard />

        {error ? (
          <ErrorState description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : !isLoading && rows.length === 0 ? (
          <InventoryEmptyState
            illustrationPreset="inventory"
            title="No variants found"
            description="Add products with variants to configure costing."
            className="flex-1 h-full"
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            pagination={{ mode: "server", page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
            minWidth="700px"
          />
        )}
      </div>
    </PageWrapper>
  );
}
