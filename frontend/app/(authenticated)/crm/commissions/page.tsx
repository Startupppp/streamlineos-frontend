"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import {
  useCommissionAccrual,
  useCommissionEarnings,
  useCommissionPlans,
} from "@/hooks/api/crm/commission";
import { getErrorMessage } from "@/lib/get-error-message";
import { AccrualSummary } from "@/features/crm/commissions/accrual-summary";
import { AccrualWorking } from "@/features/crm/commissions/accrual-working";
import { EarningsLedger } from "@/features/crm/commissions/earnings-ledger";
import { PlanList } from "@/features/crm/commissions/plan-list";
import { formatPeriodRange } from "@/features/crm/commissions/commission-format";

type CommissionTab = "period" | "earnings" | "plans";

const TABS: { value: CommissionTab; label: string }[] = [
  { value: "period", label: "This period" },
  { value: "earnings", label: "Earnings" },
  { value: "plans", label: "Plans" },
];

/**
 * What a rep is owed, and why.
 *
 * The period is stepped through by the server's own boundaries rather than by a
 * date picker: how long a period is belongs to the plan version in force, so
 * "the month" is not a question the client can answer. Stepping back means
 * asking for the day before this period started, which is a date the payload
 * already told us.
 */
export default function CommissionsPage() {
  const [tab, setTab] = useState<CommissionTab>("period");
  const [on, setOn] = useState<string | undefined>(undefined);
  const display = useOrgDisplay();

  const accrual = useCommissionAccrual(on === undefined ? undefined : { on });
  const earnings = useCommissionEarnings({ limit: 100 });
  const plans = useCommissionPlans();

  const handleTabChange = useCallback((value: string) => {
    const next = TABS.find((entry) => entry.value === value);
    if (next) setTab(next.value);
  }, []);

  const stepBack = useCallback(() => {
    const start = accrual.data?.periodStart;
    if (!start) return;
    const previous = new Date(`${start}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    setOn(previous.toISOString().slice(0, 10));
  }, [accrual.data?.periodStart]);

  const stepForward = useCallback(() => {
    const end = accrual.data?.periodEnd;
    if (!end) return;
    const next = new Date(`${end}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const iso = next.toISOString().slice(0, 10);
    // Never step past today: a future period has nothing in it and the server
    // would answer with an empty accrual that reads like a data problem.
    setOn(iso > new Date().toISOString().slice(0, 10) ? undefined : iso);
  }, [accrual.data?.periodEnd]);

  const atCurrentPeriod = on === undefined;

  const subtitle = useMemo(() => {
    if (!accrual.data) return undefined;
    return formatPeriodRange(
      accrual.data.periodStart,
      accrual.data.periodEnd,
      display.locale,
    );
  }, [accrual.data, display.locale]);

  /**
   * Ticket 26. Every read on this page is gated on the earnings key, and a
   * disabled TanStack query reports no rows with `isLoading: false` — the same
   * flags an empty ledger has. Without this the screen would tell somebody they
   * have earned nothing, when the truth is that they may not look.
   */
  if (useCanState("crm:commission-earnings:view") === "denied")
    return <NoPermissionState permission="crm:commission-earnings:view" />;

  return (
    <PageWrapper
      title="Commissions"
      subtitle={subtitle}
      filters={
        <div className="flex w-full items-center gap-3">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              {TABS.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value}>
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {tab === "period" ? (
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={stepBack}
                disabled={!accrual.data}
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stepForward}
                disabled={!accrual.data || atCurrentPeriod}
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6">
        {tab === "period" ? (
          accrual.isLoading ? (
            <LoadingBlock />
          ) : accrual.error ? (
            <ErrorState
              title="Couldn't load your commission"
              description={getErrorMessage(accrual.error)}
              onRetry={() => void accrual.refetch()}
            />
          ) : accrual.data ? (
            <>
              <AccrualSummary accrual={accrual.data} locale={display.locale} />
              <AccrualWorking accrual={accrual.data} locale={display.locale} />
            </>
          ) : null
        ) : null}

        {tab === "earnings" ? (
          earnings.isLoading ? (
            <LoadingBlock />
          ) : earnings.error ? (
            <ErrorState
              title="Couldn't load the earnings ledger"
              description={getErrorMessage(earnings.error)}
              onRetry={() => void earnings.refetch()}
            />
          ) : (
            <EarningsLedger earnings={earnings.data ?? []} locale={display.locale} />
          )
        ) : null}

        {tab === "plans" ? (
          /*
           * A second key, and therefore a second denial. Somebody who may read
           * their own earnings need not be able to read the plan catalogue, and
           * collapsing that into an empty list would be the same mistake this
           * page guards against at the top.
           *
           * `denied`, not `!allowed`: until the access snapshot lands the gate
           * is `pending`, and reading that as a refusal shows "no permission" to
           * somebody who has it.
           */
          plans.access.denied ? (
            <NoPermissionState permission="crm:commission-plans:view" compact />
          ) : plans.isLoading ? (
            <LoadingBlock />
          ) : plans.error ? (
            <ErrorState
              title="Couldn't load commission plans"
              description={getErrorMessage(plans.error)}
              onRetry={() => void plans.refetch()}
            />
          ) : (
            <PlanList plans={plans.data ?? []} locale={display.locale} />
          )
        ) : null}
      </div>
    </PageWrapper>
  );
}

function LoadingBlock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
