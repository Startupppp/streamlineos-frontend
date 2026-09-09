"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { useCategories, useProductVariants } from "@/hooks/api/inventory/products";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import {
  useApproveRecommendation,
  useDismissRecommendation,
  useSlottingRecommendations,
  useSlottingRules,
  type SlottingRecommendation,
  type SlottingRule,
} from "@/hooks/api/inventory/slotting-labor";
import { SlottingRuleCreateSheet } from "@/features/inventory/components/slotting/slotting-rule-create-sheet";
import { SlottingRuleActiveToggle } from "@/features/inventory/components/slotting/slotting-rule-active-toggle";
import {
  buildSlottingRuleColumns,
  type NameSource,
} from "@/features/inventory/components/slotting/slotting-rule-columns";
import { buildReslotRecommendationColumns } from "@/features/inventory/components/slotting/reslot-recommendation-columns";

function SlottingContent() {
  const rulesGate = usePermissionGate("inventory:warehouses:read");
  const canReadRules = rulesGate.allowed;
  const canReadStock = useCan("inventory:stock:read");
  const canDecide = useCan("inventory:warehouses:manage");
  const canMove = useCan("inventory:stock:transfer");
  const canReadCatalogue = useCan("inventory:products:read");

  const rules = useSlottingRules();
  const recommendations = useSlottingRecommendations();
  const dismiss = useDismissRecommendation();
  const approve = useApproveRecommendation();

  const warehousesQuery = useWarehouses();
  const categoriesQuery = useCategories();
  const variantsQuery = useProductVariants();

  const [createOpen, setCreateOpen] = useState(false);

  const ruleRows = useMemo(() => (Array.isArray(rules.data) ? rules.data : []), [rules.data]);
  const recRows = useMemo(
    () => (Array.isArray(recommendations.data) ? recommendations.data : []),
    [recommendations.data],
  );

  const warehouses = useMemo<NameSource>(
    () => ({
      names: new Map((warehousesQuery.data ?? []).map((row) => [row.id, row.name])),
      isLoading: warehousesQuery.isLoading,
      canRead: canReadRules,
      deniedNote: "Needs warehouse access",
    }),
    [canReadRules, warehousesQuery.data, warehousesQuery.isLoading],
  );

  const categories = useMemo<NameSource>(
    () => ({
      names: new Map((categoriesQuery.data ?? []).map((row) => [row.id, row.name])),
      isLoading: categoriesQuery.isLoading,
      canRead: canReadCatalogue,
      deniedNote: "Needs catalogue access",
    }),
    [canReadCatalogue, categoriesQuery.data, categoriesQuery.isLoading],
  );

  const variants = useMemo<NameSource>(
    () => ({
      names: new Map(
        (variantsQuery.data ?? []).map((row) => [row.id, `${row.productName} — ${row.name}`]),
      ),
      isLoading: variantsQuery.isLoading,
      canRead: canReadCatalogue,
      deniedNote: "Needs catalogue access",
    }),
    [canReadCatalogue, variantsQuery.data, variantsQuery.isLoading],
  );

  const handleRetry = useCallback(() => {
    void rules.refetch();
    void recommendations.refetch();
  }, [recommendations, rules]);

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback((next: boolean) => setCreateOpen(next), []);

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
    (recommendation: SlottingRecommendation, toLocationId: number) => {
      approve.mutate(
        { recommendationId: recommendation.id, toLocationId },
        {
          onSuccess: () => toast.success("Transfer raised"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [approve],
  );

  const renderActiveControl = useCallback(
    (rule: SlottingRule) => <SlottingRuleActiveToggle rule={rule} />,
    [],
  );

  const ruleColumns = useMemo(
    () =>
      buildSlottingRuleColumns({
        canManage: canDecide,
        warehouses,
        categories,
        variants,
        locationsReadable: canReadRules,
        renderActiveControl,
      }),
    [canDecide, canReadRules, categories, renderActiveControl, variants, warehouses],
  );

  const recColumns = useMemo(
    () =>
      buildReslotRecommendationColumns({
        canMove,
        canDismiss: canDecide,
        locationsReadable: canReadRules,
        variants,
        isApproving: approve.isPending,
        onApprove: handleApprove,
        onDismiss: handleDismiss,
      }),
    [approve.isPending, canDecide, canMove, canReadRules, handleApprove, handleDismiss, variants],
  );

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
          description={getErrorMessage(rules.error ?? recommendations.error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Slotting"
        subtitle="Where each SKU belongs, and what is standing somewhere else"
        actions={
          canDecide ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              onClick={handleOpenCreate}
            >
              New rule
            </AnimatedIconButton>
          ) : undefined
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <section className="space-y-2">
            <h2 className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
              Rules
            </h2>
            {ruleRows.length > 0 ? (
              <DataTable
                data={ruleRows}
                columns={ruleColumns}
                getRowKey={(row) => row.id}
                minWidth="900px"
                pagination={{ pageSize: 25 }}
              />
            ) : (
              <InventoryEmptyState
                illustration={<EmptyWarehouseIllustration />}
                title="No slotting rules yet"
                description="Without rules, putaway ranks bins by remaining room alone — which fills a building evenly and slots it badly."
                action={canDecide ? { label: "New rule", onClick: handleOpenCreate } : undefined}
                access={rulesGate}
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
              <DataTable
                data={recRows}
                columns={recColumns}
                getRowKey={(row) => row.id}
                minWidth="1000px"
                pagination={{ pageSize: 25 }}
              />
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

      <SlottingRuleCreateSheet open={createOpen} onOpenChange={handleCreateOpenChange} />
    </>
  );
}

export default function SlottingPage() {
  return (
    <Suspense>
      <SlottingContent />
    </Suspense>
  );
}
