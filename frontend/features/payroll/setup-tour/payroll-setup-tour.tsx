"use client";

import { Button } from "@/components/ui/button";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";
import { usePayrollSampleData } from "@/hooks/api/payroll/sample-data";
import { SampleDataBanner } from "./sample-data-banner";
import { SampleDataChoice } from "./sample-data-choice";
import { SetupTourCard } from "./setup-tour-card";
import { tourSteps } from "./tour-steps";
import { useDismissal } from "./use-dismissal";

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PayrollSetupTour() {
  const canManage = useCan("payroll:settings:manage");
  const payrollOn = useModuleEnabled("payroll");
  const sample = usePayrollSampleData();
  const readiness = usePayrollReadiness(currentYearMonth());
  const policy = usePayrollPolicyCurrent();
  const [choiceDismissed, setChoiceDismissed] = useDismissal("first-run-choice");
  const [tourDismissed, setTourDismissed] = useDismissal("setup-tour");

  function handleStartEmpty() {
    setChoiceDismissed(true);
  }

  function handleHideTour() {
    setTourDismissed(true);
  }

  function handleShowTour() {
    setTourDismissed(false);
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
  if (!readiness.data || !sample.data || policy.isLoading) return banner;

  const people = readiness.data.people;
  const steps = tourSteps({
    people,
    hasRun: readiness.data.run !== null,
    payrollOn,
    policyActive: Boolean(policy.data?.policy),
  });
  const showChoice = !sample.data.present && people.payable === 0 && !choiceDismissed;
  const allDone = steps.every((step) => step.done);

  return (
    <div className="space-y-3">
      {banner}
      {showChoice && <SampleDataChoice onStartEmpty={handleStartEmpty} />}
      {!showChoice && !allDone && !tourDismissed && <SetupTourCard steps={steps} onDismiss={handleHideTour} />}
      {!showChoice && !allDone && tourDismissed && (
        <Button size="sm" variant="link" className="h-7 px-0 text-xs" onClick={handleShowTour}>
          Show setup guide
        </Button>
      )}
    </div>
  );
}
