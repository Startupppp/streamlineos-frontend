"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, SkeletonTable } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeUp } from "@/lib/motion-variants";
import { useSerial, useTraceability } from "@/hooks/api/inventory/traceability";
import { SERIAL_STATUS_LABEL } from "@/features/inventory/lib";
import { MovementHistoryTable } from "./movement-history-table";
import { TraceabilityTimeline } from "./traceability-timeline";

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}

interface SerialDetailClientProps {
  serialId: number;
}

export function SerialDetailClient({ serialId }: SerialDetailClientProps) {
  const [showTraceability, setShowTraceability] = useState(false);

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
      <PageWrapper
        backHref="/inventory/serials"
        title="Loading…"
        eyebrow="Operations · Inventory"
      >
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !serial) {
    return (
      <PageWrapper
        backHref="/inventory/serials"
        title="Serial Detail"
        eyebrow="Operations · Inventory"
      >
        <ErrorState
          title="Failed to load serial"
          description="Could not retrieve serial number details. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      backHref="/inventory/serials"
      eyebrow="Operations · Inventory"
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
              <p className="text-sm font-semibold text-foreground truncate">{serial.productName}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                SKU
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm font-semibold text-foreground font-mono">{serial.variantSku}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm font-semibold text-foreground">
                {serial.locationName ?? "—"}
              </p>
              {serial.warehouseName && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{serial.warehouseName}</p>
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
              className="h-7 text-xs gap-1"
              onClick={handleToggleTraceability}
            >
              {showTraceability ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
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
