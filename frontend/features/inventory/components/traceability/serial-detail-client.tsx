"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";
import { useMotionVariants } from "@/lib/motion-variants";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useLot, useSerial, useTraceability } from "@/hooks/api/inventory/traceability";
import { SERIAL_STATUS_LABEL } from "@/features/inventory/lib";
import { MovementHistoryTable } from "./movement-history-table";
import { TraceabilityTimeline } from "./traceability-timeline";

interface SerialDetailClientProps {
  serialId: number;
}

export function SerialDetailClient({ serialId }: SerialDetailClientProps) {
  const canViewStock = useCan("inventory:stock:read");
  const { fadeUp } = useMotionVariants();
  const [showTraceability, setShowTraceability] = useState(false);
  const { iconRef: traceChevronRef, hoverHandlers: traceHoverHandlers } = useAnimatedIcon();

  const { data, isLoading, isError, error, refetch } = useSerial(serialId);
  const lotQuery = useLot(data?.serial.lotId ?? 0);

  const {
    data: traceResult,
    isLoading: traceLoading,
    isFetching: traceFetching,
  } = useTraceability({ serialId: showTraceability ? serialId : undefined });

  function handleRetry(): void {
    void refetch();
  }

  function handleToggleTraceability(): void {
    setShowTraceability((prev) => !prev);
  }

  // G8. Denied is not empty. Placed after every hook, not at the top of
  // the component: an early return above a useState or useQuery makes the
  // hook order depend on a permission, which React forbids and which only
  // shows up for the user who lacks the key.
  if (!canViewStock) {
    return (
      <PageWrapper title="Serial">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <InventoryDetailPageLoading
        title="Loading…"
        backHref="/inventory/serials"
        statCount={4}
        actions={null}
      />
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper
        backHref="/inventory/serials"
        title="Serial Detail"
      >
        <ErrorState
          title="Failed to load serial"
          description={error ? getErrorMessage(error) : "Could not retrieve serial number details."}
          onRetry={handleRetry}
          className="flex-1 min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  const { serial, movements } = data;
  const lotNumber = lotQuery.data?.lot.lotNumber;

  return (
    <PageWrapper
      backHref="/inventory/serials"
      title={`Serial ${serial.serialNumber}`}
      subtitle={`${serial.productVariant.product.name} · ${serial.productVariant.sku}`}
      badge={SERIAL_STATUS_LABEL[serial.status]}
    >
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
        <StatCardGrid>
          <StatCard label="Product" value={serial.productVariant.product.name} />
          <StatCard label="SKU" value={serial.productVariant.sku} />
          <StatCard
            label="Location"
            value={serial.currentLocation?.name ?? "—"}
            subtitle={serial.currentLocation?.warehouse.name}
          />
          <StatCard
            label="Lot #"
            value={lotNumber ?? "—"}
            href={serial.lotId !== null ? `/inventory/lots/${String(serial.lotId)}` : undefined}
          />
        </StatCardGrid>

        <PageSection title="Movement History">
          <MovementHistoryTable movements={movements} />
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
