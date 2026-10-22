"use client";

import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";
import { usePayrollSampleData } from "@/hooks/api/payroll/sample-data";
import { SampleDataBanner } from "./sample-data-banner";
import { SampleDataChoice } from "./sample-data-choice";
import { useDismissal } from "./use-dismissal";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PayrollSetupTour() {
  const canManage = useCan("payroll:settings:manage");
  const sample = usePayrollSampleData();
  const readiness = usePayrollReadiness(currentYearMonth());
  const [choiceDismissed, setChoiceDismissed] = useDismissal("first-run-choice");

  function handleStartEmpty() {
    setChoiceDismissed(true);
  }

  function handleRetry() {
    void readiness.refetch();
    void sample.refetch();
  }

  const banner = sample.data?.present ? (
    <SampleDataBanner people={sample.data.people} canRemove={canManage} />
  ) : null;

  if (!canManage) return banner;
  if (readiness.isError || sample.isError) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Couldn&apos;t load payroll setup progress.</span>
        <Button size="sm" variant="link" className="h-7 px-0" onClick={handleRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (!readiness.data || !sample.data) return banner;

  const showChoice =
    !sample.data.present && readiness.data.people.payable === 0 && !choiceDismissed;

  return (
    <div className="space-y-3">
      {banner}
      {showChoice ? <SampleDataChoice onStartEmpty={handleStartEmpty} /> : null}
    </div>
  );
}
