"use client";

export const dynamic = "force-dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmployeeOnboardingShell } from "@/features/employee-onboarding/components/employee-onboarding-shell";
import { StepPersonal } from "@/features/employee-onboarding/components/step-personal";
import { StepBank } from "@/features/employee-onboarding/components/step-bank";
import { StepReview } from "@/features/employee-onboarding/components/step-review";
import {
  ONBOARDING_SEQUENCE,
  STEP_IDS,
  STEP_TITLES,
} from "@/features/employee-onboarding/lib/constants";
import { useOnboardingWizard } from "@/features/employee-onboarding/hooks/use-onboarding-wizard";

export default function EmployeeOnboardingPage() {
  const wizard = useOnboardingWizard();

  if (wizard.isLoading) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col gap-4 px-4 py-6 sm:px-8 md:max-w-none md:w-1/2 md:px-8">
          <Skeleton className="h-8 w-full md:hidden" />
          <Skeleton className="hidden h-6 w-48 md:block" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="hidden h-full w-1/2 shrink-0 flex-col gap-6 border-l border-border/60 p-8 md:flex lg:p-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-4 h-72 w-full max-w-[440px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (wizard.loadError) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center p-4 sm:p-8">
        <ErrorState
          className="max-w-xl"
          title="Onboarding couldn't be loaded"
          description={getErrorMessage(wizard.loadError)}
          onRetry={wizard.refetchAll}
        />
      </div>
    );
  }

  return (
    <EmployeeOnboardingShell
      currentIndex={wizard.currentStepIndex}
      title={STEP_TITLES[wizard.activeTab]}
      direction={wizard.direction}
      saveState={wizard.saveState}
      completedSteps={wizard.completedSteps}
      reachableSteps={wizard.reachableSteps}
      snapshot={wizard.previewSnapshot}
      onStepSelect={wizard.handleStepSelect}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${wizard.currentStepIndex + 1} of ${ONBOARDING_SEQUENCE.length}: ${STEP_TITLES[wizard.activeTab]}`}
      </div>

      {wizard.activeTab === STEP_IDS.PERSONAL ? (
        <StepPersonal
          onComplete={wizard.handlePersonalComplete}
          onDraftChange={wizard.handlePersonalDraftChange}
          onClear={wizard.handlePersonalClear}
          defaultValues={wizard.wizardDraft.personal}
          hasPrefilledData={wizard.hasPersonalPrefill}
        />
      ) : null}
      {wizard.activeTab === STEP_IDS.BANK ? (
        <StepBank
          countryCode={wizard.countryCode}
          onComplete={wizard.handleBankComplete}
          onDraftChange={wizard.handleBankDraftChange}
          onClear={wizard.handleBankClear}
          onBack={wizard.handleGoToPersonal}
          defaultValues={wizard.wizardDraft.bank}
          hasPrefilledData={wizard.hasBankPrefill}
        />
      ) : null}
      {wizard.activeTab === STEP_IDS.REVIEW ? (
        <StepReview
          completedSteps={wizard.completedSteps}
          draft={wizard.wizardDraft}
          onBack={wizard.handleGoToBank}
          onEditPersonal={wizard.handleGoToPersonal}
          onEditBank={wizard.handleGoToBank}
          onClearDraft={wizard.clearDraft}
        />
      ) : null}
    </EmployeeOnboardingShell>
  );
}
