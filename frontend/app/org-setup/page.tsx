"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";
import { TOTAL_STEPS, STEP_TITLES } from "./_lib/constants";
import { loadDraft, clearDraft, saveDraft } from "./_lib/draft";
import type { WizardData, Invitee } from "./_lib/types";
import { WizardShell } from "./_components/wizard-shell";
import { StepWelcome } from "./_components/step-welcome";
import { StepGoals } from "./_components/step-goals";
import { StepIndustry } from "./_components/step-industry";
import { StepCompany } from "./_components/step-company";
import { StepGeneration } from "./_components/step-generation";
import { StepApps } from "./_components/step-apps";
import { StepInvite } from "./_components/step-invite";
import { StepImport } from "./_components/step-import";
import { StepAI } from "./_components/step-ai";
import { StepComplete } from "./_components/step-complete";

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>(() => loadDraft());
  const [showCelebration, setShowCelebration] = useState(false);

  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "";

  const patch = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...updates };
      saveDraft(next);
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setData((prev) => {
      const has = prev.goals.includes(id);
      const next = {
        ...prev,
        goals: has ? prev.goals.filter((g) => g !== id) : [...prev.goals, id],
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleSelectIndustry = useCallback(
    (industry: string) => {
      patch({ industry });
      setTimeout(goNext, 250);
    },
    [patch, goNext],
  );

  const handleToggleApp = useCallback((id: string) => {
    setData((prev) => {
      const has = prev.installedApps.includes(id);
      const next = {
        ...prev,
        installedApps: has
          ? prev.installedApps.filter((a) => a !== id)
          : [...prev.installedApps, id],
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleAddInvitee = useCallback((inv: Invitee) => {
    setData((prev) => {
      const next = { ...prev, invitees: [...prev.invitees, inv] };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleRemoveInvitee = useCallback((email: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        invitees: prev.invitees.filter((i) => i.email !== email),
      };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleSkipToDashboard = useCallback(() => {
    window.location.href = "/dashboard";
  }, []);

  useEffect(() => {
    if (step === TOTAL_STEPS) {
      clearDraft();
      setShowCelebration(true);
    }
  }, [step]);

  const stepTitle =
    step === 1
      ? `Welcome${firstName ? `, ${firstName}` : ""}!`
      : (STEP_TITLES[step - 1] ?? "");

  return (
    <div className="w-full max-w-sm relative">
      {showCelebration && (
        <ConfettiOverlay
          durationMs={2600}
          onDone={() => setShowCelebration(false)}
        />
      )}
      <WizardShell step={step} totalSteps={TOTAL_STEPS} title={stepTitle} direction={direction}>
        {step === 1 && (
          <StepWelcome onNext={goNext} onSkip={handleSkipToDashboard} />
        )}
        {step === 2 && (
          <StepGoals
            goals={data.goals}
            onToggle={handleToggleGoal}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 3 && (
          <StepIndustry
            industry={data.industry}
            onSelect={handleSelectIndustry}
            onBack={goBack}
          />
        )}
        {step === 4 && (
          <StepCompany
            data={data}
            patch={patch}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 5 && <StepGeneration data={data} onNext={goNext} />}
        {step === 6 && (
          <StepApps
            installedApps={data.installedApps}
            onToggle={handleToggleApp}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 7 && (
          <StepInvite
            invitees={data.invitees}
            onAdd={handleAddInvitee}
            onRemove={handleRemoveInvitee}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {step === 8 && <StepImport onBack={goBack} onNext={goNext} />}
        {step === 9 && <StepAI onBack={goBack} onNext={goNext} />}
        {step === 10 && <StepComplete data={data} />}
      </WizardShell>
    </div>
  );
}
