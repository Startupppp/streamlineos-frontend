"use client";

import { useCallback } from "react";
import { usePageState } from "@/hooks/api/use-page-state";
import { motion } from "framer-motion";
import { TrendingUp, Target, Layers, Camera } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDealsIllustration } from "@/components/illustrations";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMotionVariants } from "@/lib/motion-variants";
import { useDeals, useCaptureForecastSnapshot, useForecastSnapshots } from "@/hooks/api/crm";
import { DealForecastSummary } from "@/features/crm/deals/deal-forecast-summary";
import { DealForecastChart } from "@/features/crm/deals/deal-forecast-chart";
import { DealCloseDateList } from "@/features/crm/deals/deal-close-date-list";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageState } from "@/components/shared/page-state";

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard label="Total Pipeline" value="" isLoading icon={TrendingUp} tone="blue" />
        <StatCard label="Weighted Forecast" value="" isLoading icon={Target} tone="blue" />
        <StatCard label="Open Deals" value="" isLoading icon={Layers} tone="emerald" />
      </StatCardGrid>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DealForecastPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const { data: deals, isLoading, isError, error, refetch, access } = useDeals({ limit: 100 });
  const { data: snapshots = [] } = useForecastSnapshots({ limit: 10 });
  const captureForecast = useCaptureForecastSnapshot();
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.stage !== "LOST");

  const handleRefetch = useCallback(() => { void refetch(); }, [refetch]);

  const pageState = usePageState({ permission: "crm:deals:forecast", isLoading, isError, error });

  const handleCapture = useCallback(() => {
    captureForecast.mutate(
      { period: currentPeriod },
      {
        onSuccess: () => toast.success("Forecast snapshot saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [captureForecast, currentPeriod]);

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper
        title="Deal Forecast"
        subtitle="Pipeline forecast and revenue projection"
        backHref="/crm/deals"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRefetch} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  if (pageState.kind === "loading") {
    return (
      <PageWrapper
        title="Deal Forecast"
        subtitle="Pipeline forecast and revenue projection"
        backHref="/crm/deals"
      >
        <ForecastSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Deal Forecast"
      subtitle="Pipeline forecast and revenue projection"
      backHref="/crm/deals"
      actions={
        <Button size="sm" onClick={handleCapture} disabled={captureForecast.isPending}>
          <Camera className="h-3.5 w-3.5 mr-1.5" />
          Capture Snapshot
        </Button>
      }
    >
      {openDeals.length === 0 ? (
        <EmptyState
          access={access}
          illustration={<EmptyDealsIllustration />}
          title="No open deals to forecast"
          description="Create deals in your pipeline to see revenue forecasts here."
          action={{ label: "Go to Deals", href: "/crm/deals" }}
          className="flex-1"
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <DealForecastSummary />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealForecastChart deals={allDeals} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealCloseDateList deals={allDeals} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="bg-card border border-border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Saved Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                {snapshots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No snapshots yet. Capture your first forecast snapshot above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                      >
                        <div>
                          <span className="font-medium">{snap.period}</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(snap.capturedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {snap.data.totalDeals} deals · ₹{(snap.data.totalWeighted / 100000).toFixed(1)}L weighted
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
