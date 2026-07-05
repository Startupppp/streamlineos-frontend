"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll";
import { toast } from "sonner";
import {
  loadDraft,
  saveDraft,
  loadStep,
  saveStep,
  clearAll,
  type SetupDraft,
} from "./lib/draft";
import { WizardShell } from "./wizard-shell";
import { StepProfile } from "./steps/step-profile";
import { StepTemplate } from "./steps/step-template";
import { StepToggles } from "./steps/step-toggles";
import { StepReview } from "./steps/step-review";
import { StepActivate } from "./steps/step-activate";

const TOTAL_STEPS = 5;

const STEP_TITLES = [
  "Company Payroll Profile",
  "Choose Template",
  "Feature Toggles",
  "Review Policy",
  "Activate Payroll",
];

export function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplate = searchParams.get("template") ?? undefined;
  const preselectedTemplateIdStr = searchParams.get("templateId");
  const preselectedTemplateId = preselectedTemplateIdStr ? Number(preselectedTemplateIdStr) : undefined;

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<SetupDraft>({});
  const [initialized, setInitialized] = useState(false);

  const { data: current, isLoading: policyLoading } = usePayrollPolicyCurrent();

  useEffect(() => {
    if (initialized) return;
    setDraft(loadDraft());
    const saved = loadStep();
    if (saved >= 1 && saved <= TOTAL_STEPS) setStep(saved);
    setInitialized(true);
  }, [initialized]);

  useEffect(() => {
    if (!policyLoading && current?.policy?.status === "ACTIVE") {
      toast.info("Payroll is already active. Redirecting to settings…");
      router.replace("/payroll/settings");
    }
  }, [current, policyLoading, router]);

  function updateDraft(partial: Partial<SetupDraft>) {
    const next = { ...draft, ...partial };
    setDraft(next);
    saveDraft(next);
  }

  function handleClearAll() {
    clearAll();
    setDraft({});
    setStep(1);
  }

  function goNext() {
    const next = Math.min(step + 1, TOTAL_STEPS);
    setDirection(1);
    setStep(next);
    saveStep(next);
  }

  function goBack() {
    const prev = Math.max(step - 1, 1);
    setDirection(-1);
    setStep(prev);
    saveStep(prev);
  }

  if (!initialized) return null;

  return (
    <PageWrapper
      title="Payroll Setup"
      subtitle="Configure your payroll in 5 steps"
      backHref="/payroll"
    >
      <div className="max-w-2xl mx-auto py-4">
        <WizardShell
          step={step}
          totalSteps={TOTAL_STEPS}
          title={STEP_TITLES[step - 1] ?? ""}
          direction={direction}
        >
          {step === 1 && (
            <StepProfile draft={draft} updateDraft={updateDraft} goNext={goNext} />
          )}
          {step === 2 && (
            <StepTemplate
              draft={draft}
              updateDraft={updateDraft}
              goNext={goNext}
              goBack={goBack}
              preselectedKey={preselectedTemplate}
              preselectedId={preselectedTemplateId}
            />
          )}
          {step === 3 && (
            <StepToggles
              draft={draft}
              updateDraft={updateDraft}
              goNext={goNext}
              goBack={goBack}
            />
          )}
          {step === 4 && (
            <StepReview
              draft={draft}
              goNext={goNext}
              goBack={goBack}
            />
          )}
          {step === 5 && (
            <StepActivate draft={draft} clearAll={handleClearAll} />
          )}
        </WizardShell>
      </div>
    </PageWrapper>
  );
}
