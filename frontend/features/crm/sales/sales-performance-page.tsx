"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCanState } from "@/hooks/api/access";
import { useSalesFunnel } from "@/hooks/api/crm/sales";
import { PeriodSelector, periodToDateRange, type Period } from "@/features/crm/analytics/period-selector";
import { SalesAgingReport, SalesCohortReport, SalesFunnelReport, SalesVelocityReport } from "./sales-pipeline-reports";
import { SalesCycleLengthReport, SalesLostAnalysisReport } from "./sales-deal-reports";
import { SalesLeaderboardReport, SalesRepComparisonReport } from "./sales-rep-reports";

/**
 * The `/sales/dashboard/*` reports, one panel each.
 *
 * The period applies to the reports that take a range (funnel, leaderboard,
 * velocity, rep comparison); aging, cohorts, cycle length and lost deals are
 * fixed windows the backend defines. The page itself resolves on `sales:view`;
 * the two deal reports carry `crm:deals:read` and deny inside their own panels.
 */
export function SalesPerformancePage() {
  const [period, setPeriod] = useState<Period>("quarter");
  const range = useMemo(() => periodToDateRange(period), [period]);
  const funnel = useSalesFunnel(range);
  const dealReports = useCanState("crm:deals:read");

  // Report failures stay inside their panels; the page resolves only access,
  // the CRM module, and the funnel's own error for its 402 upgrade path.
  const pageState = usePageState({
    permission: "sales:view",
    module: "crm",
    isLoading: false,
    isError: false,
    error: funnel.error,
  });

  return (
    <PageWrapper
      title="Sales performance"
      subtitle="Funnel, reps, velocity and why deals are lost."
      backHref="/crm/analytics"
      filters={<PeriodSelector period={period} onPeriodChange={setPeriod} />}
    >
      <PageState resolution={pageState} className="flex-1">
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
          <SalesFunnelReport range={range} />
          <SalesLeaderboardReport range={range} />
          <SalesVelocityReport range={range} />
          <SalesAgingReport />
          <SalesRepComparisonReport range={range} />
          <SalesCohortReport />
          {dealReports !== "denied" ? (
            <>
              <SalesCycleLengthReport />
              <SalesLostAnalysisReport />
            </>
          ) : null}
        </div>
      </PageState>
    </PageWrapper>
  );
}
