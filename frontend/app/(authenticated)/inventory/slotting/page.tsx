"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useApproveRecommendation,
  useDismissRecommendation,
  useSlottingRecommendations,
  useSlottingRules,
  type SlottingRecommendation,
  type SlottingRule,
} from "@/hooks/api/inventory/slotting-labor";

const RULE_COLUMNS: DataTableColumn<SlottingRule>[] = [
  { key: "name", header: "Rule", cell: (row) => <span className="text-sm font-medium">{row.name}</span> },
  {
    key: "match",
    header: "Matches",
    cell: (row) =>
      row.matchType === "VELOCITY_CLASS"
        ? `Class ${row.velocityClass}`
        : row.matchType === "CATEGORY"
          ? `Category #${row.categoryId}`
          : `Variant #${row.productVariantId}`,
  },
  {
    key: "zone",
    header: "Sends to",
    cell: (row) => <span className="font-mono text-xs">Zone #{row.targetZoneLocationId}</span>,
  },
  {
    key: "priority",
    header: "Priority",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => row.priority,
  },
  {
    key: "active",
    header: "State",
    cell: (row) => (
      <Badge
        variant="outline"
        className={
          row.isActive
            ? "text-dense bg-status-success-surface text-status-success-ink border-status-success-rule"
            : "text-dense bg-muted text-muted-foreground border-border"
        }
      >
        {row.isActive ? "Active" : "Off"}
      </Badge>
    ),
  },
];

function SlottingContent() {
  const canReadRules = useCan("inventory:warehouses:read");
  const canReadStock = useCan("inventory:stock:read");
  const canDecide = useCan("inventory:warehouses:manage");
  const canMove = useCan("inventory:stock:transfer");

  const rules = useSlottingRules();
  const recommendations = useSlottingRecommendations();
  const dismiss = useDismissRecommendation();
  const approve = useApproveRecommendation();

  const [destinations, setDestinations] = useState<Record<number, string>>({});

  const ruleRows = useMemo(() => (Array.isArray(rules.data) ? rules.data : []), [rules.data]);
  const recRows = useMemo(
    () => (Array.isArray(recommendations.data) ? recommendations.data : []),
    [recommendations.data],
  );

  const handleRetry = useCallback(() => {
    void rules.refetch();
    void recommendations.refetch();
  }, [recommendations, rules]);

  const handleDismiss = useCallback(
    (recommendationId: number) => {
      dismiss.mutate(
        { recommendationId },
        {
          onSuccess: () => toast.success("Recommendation dismissed"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [dismiss],
  );

  const handleApprove = useCallback(
    (recommendation: SlottingRecommendation) => {
      const destination = Number(destinations[recommendation.id]);
      if (!Number.isInteger(destination) || destination <= 0) {
        toast.error("Enter the bin inside the target zone to move to");
        return;
      }
      approve.mutate(
        { recommendationId: recommendation.id, toLocationId: destination },
        {
          onSuccess: () => toast.success("Transfer raised"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [approve, destinations],
  );

  const REC_COLUMNS: DataTableColumn<SlottingRecommendation>[] = [
    {
      key: "variant",
      header: "Variant",
      cell: (row) => <span className="text-sm">#{row.productVariantId}</span>,
    },
    {
      key: "from",
      header: "Standing at",
      cell: (row) => <span className="font-mono text-xs">#{row.fromLocationId}</span>,
    },
    {
      key: "to",
      header: "Belongs in",
      cell: (row) => <span className="font-mono text-xs">Zone #{row.toZoneLocationId}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => Number(row.quantity).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    { key: "reason", header: "Why", cell: (row) => <span className="text-dense">{row.reason}</span> },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {canMove && (
            <>
              <Input
                aria-label={`Destination bin for recommendation ${row.id}`}
                inputMode="numeric"
                className="h-8 w-24"
                placeholder="Bin id"
                value={destinations[row.id] ?? ""}
                onChange={(e) =>
                  setDestinations((current) => ({ ...current, [row.id]: e.target.value }))
                }
              />
              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleApprove(row)}>
                Approve
              </Button>
            </>
          )}
          {canDecide && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleDismiss(row.id)}>
              Dismiss
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!canReadRules && !canReadStock) {
    return (
      <PageWrapper title="Slotting">
        <NoPermissionState permission="inventory:warehouses:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (rules.isLoading || recommendations.isLoading) {
    return (
      <PageWrapper title="Slotting">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (rules.isError || recommendations.isError) {
    return (
      <PageWrapper title="Slotting">
        <ErrorState
          title="Failed to load slotting"
          description="An error occurred while fetching rules and re-slot recommendations."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Slotting"
      subtitle="Where each SKU belongs, and what is standing somewhere else"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-6">
        <section className="space-y-2">
          <h2 className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            Rules
          </h2>
          {ruleRows.length > 0 ? (
            <DataTable data={ruleRows} columns={RULE_COLUMNS} getRowKey={(row) => row.id} />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title="No slotting rules yet"
              description="Without rules, putaway ranks bins by remaining room alone — which fills a building evenly and slots it badly."
            />
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
            Re-slot recommendations
          </h2>
          <p className="text-xs text-muted-foreground">
            Generated nightly and read-only. Nothing moves until somebody approves it and names a
            bin — a warehouse that rearranges itself overnight is one where a picker&apos;s memory
            of yesterday is a liability.
          </p>
          {recRows.length > 0 ? (
            <DataTable data={recRows} columns={REC_COLUMNS} getRowKey={(row) => row.id} />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title="Nothing to re-slot"
              description="Every SKU with a rule is standing in the zone that rule points at."
            />
          )}
        </section>
      </div>
    </PageWrapper>
  );
}

export default function SlottingPage() {
  return (
    <Suspense>
      <SlottingContent />
    </Suspense>
  );
}
