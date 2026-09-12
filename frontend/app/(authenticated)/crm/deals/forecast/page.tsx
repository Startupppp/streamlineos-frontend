"use client";

import { useCallback } from "react";
import { useCanState } from "@/hooks/api/access";
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
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";

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

  const handleCapture = useCallback(() => {
    captureForecast.mutate(
      { period: currentPeriod },
      {
        onSuccess: () => toast.success("Forecast snapshot saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [captureForecast, currentPeriod]);

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Placed after the last hook and before the first branch that can return:
   * denial outranks loading, error and emptiness alike, and a hook below a
   * conditional return would run in a different order on different renders.
   */
  if (useCanState("crm:deals:forecast") === "denied")
    return <NoPermissionState permission="crm:deals:forecast" />;

  if (isLoading) {
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

  if (isError) {
    return (
      <PageWrapper
        title="Deal Forecast"
        subtitle="Pipeline forecast and revenue projection"
        backHref="/crm/deals"
      >
        <ErrorState
          description={getErrorMessage(error)}
          onRetry={handleRefetch}
          className="flex-1"
        />
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
