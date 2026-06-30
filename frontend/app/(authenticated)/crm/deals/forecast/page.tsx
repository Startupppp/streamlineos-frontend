"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useDeals } from "@/hooks/api/crm";
import { DealForecastSummary } from "@/features/crm/deals/deal-forecast-summary";
import { DealForecastChart } from "@/features/crm/deals/deal-forecast-chart";
import { DealCloseDateList } from "@/features/crm/deals/deal-close-date-list";

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyForecast() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full gap-4 py-16">
      <div className="p-4 rounded-2xl bg-slate-100">
        <TrendingUp className="h-10 w-10 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">No open deals to forecast</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create deals in your pipeline to see revenue forecasts here.
        </p>
      </div>
      <Button
        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        asChild
      >
        <Link href="/crm/deals">Go to Deals</Link>
      </Button>
    </div>
  );
}

export default function DealForecastPage() {
  const { data: deals, isLoading } = useDeals({ limit: 200 });

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.stage !== "LOST");

  const backButton = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/crm/deals">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Deals
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Deal Forecast"
        subtitle="Pipeline forecast and revenue projection"
        actions={backButton}
      >
        <ForecastSkeleton />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Deal Forecast"
      subtitle="Pipeline forecast and revenue projection"
      actions={backButton}
    >
      {openDeals.length === 0 ? (
        <EmptyForecast />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <DealForecastSummary deals={allDeals} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealForecastChart deals={allDeals} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <DealCloseDateList deals={allDeals} />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
