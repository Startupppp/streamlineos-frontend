"use client";

import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, Target, Handshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDealsIllustration } from "@/components/illustrations";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useDeals } from "@/hooks/api/crm";
import { DealForecastSummary } from "@/features/crm/deals/deal-forecast-summary";
import { DealForecastChart } from "@/features/crm/deals/deal-forecast-chart";
import { DealCloseDateList } from "@/features/crm/deals/deal-close-date-list";

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard label="Total Pipeline" value="" isLoading icon={TrendingUp} tone="blue" />
        <StatCard label="Weighted Forecast" value="" isLoading icon={Target} tone="violet" />
        <StatCard label="Commit Forecast" value="" isLoading icon={Handshake} tone="emerald" />
      </StatCardGrid>
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DealForecastPage() {
  const shouldReduceMotion = useReducedMotion();
  const { data: deals, isLoading } = useDeals({ limit: 200 });

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.stage !== "LOST");

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : fadeUp;

  if (isLoading) {
    return (
      <PageWrapper
        title="Deal Forecast"
        subtitle="Pipeline forecast and revenue projection"
        backHref="/crm/deals"
        eyebrow="CRM / Deals"
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
      eyebrow="CRM / Deals"
    >
      {openDeals.length === 0 ? (
        <EmptyState
          illustration={<EmptyDealsIllustration />}
          title="No open deals to forecast"
          description="Create deals in your pipeline to see revenue forecasts here."
          action={{ label: "Go to Deals", href: "/crm/deals" }}
          className="flex-1 min-h-[50vh]"
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <DealForecastSummary deals={allDeals} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <DealForecastChart deals={allDeals} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <DealCloseDateList deals={allDeals} />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
