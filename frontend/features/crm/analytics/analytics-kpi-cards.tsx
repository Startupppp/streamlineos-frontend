"use client";

import { motion } from "framer-motion";
import { Users, IndianRupee, Percent, Award, Target } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { fadeUp } from "@/lib/motion-variants";
import type { LeadAnalyticsSummary } from "@/types/leads";
import type { SalesDashboardKPIsResult } from "@/hooks/api/crm/analytics";

interface AnalyticsKpiCardsProps {
  analyticsSummary: LeadAnalyticsSummary;
  kpis: SalesDashboardKPIsResult | undefined;
}

export function AnalyticsKpiCards({ analyticsSummary, kpis }: AnalyticsKpiCardsProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard
        label="Total Leads"
        value={analyticsSummary.totalLeads}
        icon={Users}
        index={0}
        trend={
          analyticsSummary.totalLeadsPrevPeriod > 0
            ? {
                value: Math.round(
                  ((analyticsSummary.totalLeads -
                    analyticsSummary.totalLeadsPrevPeriod) /
                    analyticsSummary.totalLeadsPrevPeriod) *
                    100,
                ),
                isPositive:
                  analyticsSummary.totalLeads >=
                  analyticsSummary.totalLeadsPrevPeriod,
              }
            : undefined
        }
      />
      <StatCard
        label="Conversion Rate"
        value={`${analyticsSummary.conversionRate}%`}
        icon={Percent}
        index={1}
        trend={
          analyticsSummary.conversionRatePrevPeriod > 0
            ? {
                value: Math.abs(
                  Math.round(
                    analyticsSummary.conversionRate -
                      analyticsSummary.conversionRatePrevPeriod,
                  ),
                ),
                isPositive:
                  analyticsSummary.conversionRate >=
                  analyticsSummary.conversionRatePrevPeriod,
              }
            : undefined
        }
      />
      <StatCard
        label="Total Revenue"
        value={`₹${(analyticsSummary.totalRevenue / 100000).toFixed(1)}L`}
        icon={IndianRupee}
        index={2}
      />
      <StatCard
        label={kpis ? "Deal Win Rate" : "Active Reps"}
        value={
          kpis
            ? `${kpis.closeRate.toFixed(1)}%`
            : analyticsSummary.assignmentDistribution.length
        }
        icon={kpis ? Award : Target}
        index={3}
        trend={
          kpis && kpis.prevCloseRate > 0
            ? {
                value: Math.abs(
                  Math.round(kpis.closeRate - kpis.prevCloseRate),
                ),
                isPositive: kpis.closeRate >= kpis.prevCloseRate,
              }
            : undefined
        }
      />
    </motion.div>
  );
}
