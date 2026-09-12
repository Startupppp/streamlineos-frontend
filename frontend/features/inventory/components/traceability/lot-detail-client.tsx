"use client";

import { useState } from "react";
import { Unlock } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardGrid, StatCard, type StatTone } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import { useMotionVariants } from "@/lib/motion-variants";
import { formatCalendarDate, formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import { useLot, useUpdateLotStatus, useTraceability } from "@/hooks/api/inventory/traceability";
import { LOT_STATUS_LABEL } from "@/features/inventory/lib";
import { LotStockTable } from "./lot-stock-table";
import { MovementHistoryTable } from "./movement-history-table";
import { TraceabilityTimeline } from "./traceability-timeline";
import { LotGenealogyPanel } from "./lot-genealogy-panel";
import { sumQuantities } from "./traceability-format";

function getExpiryTone(dateStr: string | null): StatTone {
  if (!dateStr) return "default";
  const daysLeft = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (daysLeft < 0) return "red";
  if (daysLeft <= 30) return "amber";
  return "default";
}

interface LotDetailClientProps {
  lotId: number;
}

export function LotDetailClient({ lotId }: LotDetailClientProps) {
  const canViewStock = useCan("inventory:stock:read");
  const { fadeUp } = useMotionVariants();
  const [showTraceability, setShowTraceability] = useState(false);
  const { iconRef: traceChevronRef, hoverHandlers: traceHoverHandlers } = useAnimatedIcon();
  const { iconRef: lockIconRef, hoverHandlers: lockHoverHandlers } = useAnimatedIcon();

  const { data, isLoading, isError, error, refetch } = useLot(lotId);
  const canAdjust = useCan("inventory:stock:adjust");
  const updateStatus = useUpdateLotStatus();

  const {
    data: traceResult,
    isLoading: traceLoading,
    isFetching: traceFetching,
  } = useTraceability({ lotId: showTraceability ? lotId : undefined });

  function handleRetry(): void {
    void refetch();
  }

  function handleToggleTraceability(): void {
    setShowTraceability((prev) => !prev);
  }

  function handleBlockUnblock(): void {
    if (!data) return;
    const nextStatus = data.lot.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    updateStatus.mutate({ lotId: data.lot.id, status: nextStatus });
  }

  // G8. Denied is not empty. Placed after every hook, not at the top of
  // the component: an early return above a useState or useQuery makes the
  // hook order depend on a permission, which React forbids and which only
  // shows up for the user who lacks the key.
  if (!canViewStock) {
    return (
      <PageWrapper title="Lot">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <InventoryDetailPageLoading
        title="Loading…"
        backHref="/inventory/lots"
        statCols={3}
        statCount={3}
        actions={null}
      />
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper backHref="/inventory/lots" title="Lot Detail">
        <ErrorState
          title="Failed to load lot"
          description={error ? getErrorMessage(error) : "Could not retrieve lot details."}
          onRetry={handleRetry}
          className="flex-1 min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  const { lot, stockByLocation, movements } = data;
  const canToggleStatus = canAdjust && (lot.status === "ACTIVE" || lot.status === "BLOCKED");
  const onHand = sumQuantities(stockByLocation.map((row) => row.onHand));

  return (
    <PageWrapper
      backHref="/inventory/lots"
      title={`Lot ${lot.lotNumber}`}
      subtitle={`${lot.productVariant.product.name} · ${lot.productVariant.sku}`}
      badge={LOT_STATUS_LABEL[lot.status]}
      actions={
        canToggleStatus ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleBlockUnblock}
            disabled={updateStatus.isPending}
            {...lockHoverHandlers}
          >
            {lot.status === "ACTIVE" ? (
              <>
                <LockIcon ref={lockIconRef} size={14} aria-hidden="true" />
                Block Lot
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                Unblock Lot
              </>
            )}
          </Button>
        ) : undefined
      }
    >
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
        <StatCardGrid>
          <StatCard
            label="Expiry Date"
            value={lot.expiryDate ? formatCalendarDate(lot.expiryDate) : "No expiry"}
            tone={getExpiryTone(lot.expiryDate)}
          />
          <StatCard label="On Hand" value={formatQuantity(onHand)} />
          <StatCard label="Created" value={formatShortDate(lot.createdAt)} />
        </StatCardGrid>

        <PageSection title="Stock by Location">
          <LotStockTable stockByLocation={stockByLocation} />
        </PageSection>

        <PageSection title="Movement History">
          <MovementHistoryTable movements={movements} />
        </PageSection>

        <PageSection
          title="Genealogy"
          description="Every document this lot moved on, and the lots and units those documents connect it to. The walk is capped; a partial answer says so."
        >
          <Card>
            <CardContent className="pt-4 pb-4">
              <LotGenealogyPanel lotId={lotId} />
            </CardContent>
          </Card>
        </PageSection>

        <PageSection
          title="Traceability"
          actions={
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1"
              onClick={handleToggleTraceability}
              {...traceHoverHandlers}
            >
              {showTraceability ? (
                <>
                  <ChevronUpIcon ref={traceChevronRef} size={14} aria-hidden="true" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDownIcon ref={traceChevronRef} size={14} aria-hidden="true" />
                  View Traceability
                </>
              )}
            </Button>
          }
        >
          {showTraceability && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <TraceabilityTimeline
                  result={traceResult}
                  isLoading={traceLoading || traceFetching}
                />
              </CardContent>
            </Card>
          )}
        </PageSection>
      </motion.div>
    </PageWrapper>
  );
}
