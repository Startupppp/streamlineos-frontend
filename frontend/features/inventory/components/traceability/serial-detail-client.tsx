"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";
import { fadeUp } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useSerial, useTraceability } from "@/hooks/api/inventory/traceability";
import { SERIAL_STATUS_LABEL } from "@/features/inventory/lib";
import { MovementHistoryTable } from "./movement-history-table";
import { TraceabilityTimeline } from "./traceability-timeline";

interface SerialDetailClientProps {
  serialId: number;
}

export function SerialDetailClient({ serialId }: SerialDetailClientProps) {
  const [showTraceability, setShowTraceability] = useState(false);
  const { iconRef: traceChevronRef, hoverHandlers: traceHoverHandlers } = useAnimatedIcon();

  const { data: serial, isLoading, isError, refetch } = useSerial(serialId);

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

  if (isError || !serial) {
    return (
      <PageWrapper
        backHref="/inventory/serials"
        title="Serial Detail"
      >
        <ErrorState
          title="Failed to load serial"
          description="Could not retrieve serial number details. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      backHref="/inventory/serials"
      title={`Serial ${serial.serialNumber}`}
      subtitle={`${serial.productName} · ${serial.variantSku}`}
      badge={SERIAL_STATUS_LABEL[serial.status]}
    >
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Product
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <TruncatedText text={serial.productName} className="text-sm font-semibold text-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                SKU
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm font-semibold text-foreground font-mono break-all">{serial.variantSku}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <TruncatedText text={serial.locationName ?? "—"} className="text-sm font-semibold text-foreground" />
              {serial.warehouseName && (
                <TruncatedText text={serial.warehouseName} className="text-[11px] text-muted-foreground mt-0.5" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Lot #
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {serial.lotId && serial.lotNumber ? (
                <Button variant="link" className="h-auto p-0 text-sm font-semibold font-mono" asChild>
                  <Link href={`/inventory/lots/${serial.lotId}`}>{serial.lotNumber}</Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        <PageSection title="Movement History">
          <MovementHistoryTable movements={serial.movements} />
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
