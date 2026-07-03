"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { clearBackendTokenCache } from "@/lib/api-client";
import {
  useSkipOrgSetupMutation,
  usePatchOrgSetupSessionMutation,
  useOrgSetupSessionQuery,
} from "@/lib/api/hooks/org";
import {
  STEP_TITLES,
  DEFAULT_DATA,
  deriveAppsFromGoals,
  getStepSequence,
  type StepId,
} from "@/features/org-setup/lib/constants";
import {
  loadDraft,
  clearAll,
  saveDraft,
  loadStep,
  saveStep,
} from "@/features/org-setup/lib/draft";
import type { WizardData } from "@/features/org-setup/lib/types";
import { WizardShell } from "@/features/org-setup/components/wizard-shell";
import { StepWelcome } from "@/features/org-setup/components/step-welcome";
import { StepGoals } from "@/features/org-setup/components/step-goals";
import { StepIndustry } from "@/features/org-setup/components/step-industry";
import { StepCompany } from "@/features/org-setup/components/step-company";
import { StepModules } from "@/features/org-setup/components/step-modules";
import { StepStartingData } from "@/features/org-setup/components/step-starting-data";
import { StepPayments } from "@/features/org-setup/components/step-payments";
import { StepInviteTeam } from "@/features/org-setup/components/step-invite-team";
import { StepGeneration } from "@/features/org-setup/components/step-generation";

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const { mutateAsync: skipOrgSetup } = useSkipOrgSetupMutation();
  const { mutate: patchSession } = usePatchOrgSetupSessionMutation();
  const { data: serverSession } = useOrgSetupSessionQuery();

  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });
  const hydratedFromServerRef = useRef(false);

  const sequence = useMemo(() => getStepSequence(data.goals), [data.goals]);
  const totalSteps = sequence.length;
  const currentStepId: StepId = sequence[step - 1] ?? "welcome";

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

  const persistStep = useCallback(
    (stepId: StepId, snapshot: WizardData) => {
      patchSession({ currentStep: stepId, data: snapshot });
    },
    [patchSession],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => {
      const nextIndex = Math.min(s + 1, totalSteps);
      const nextStepId = sequence[nextIndex - 1] ?? "welcome";
      persistStep(nextStepId, data);
      return nextIndex;
    });
  }, [totalSteps, sequence, data, persistStep]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleToggleGoal = useCallback((id: string) => {
    setData((prev) => {
      const has = prev.goals.includes(id);
      const newGoals = has
        ? prev.goals.filter((g) => g !== id)
        : [...prev.goals, id];
      const derived = deriveAppsFromGoals(newGoals);
      const next = { ...prev, goals: newGoals, installedApps: derived, modules: derived };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleSelectIndustry = useCallback(
    (industry: string) => {
      patch({ industry });
    },
    [patch],
  );

  const handleToggleModule = useCallback((moduleKey: string) => {
    setData((prev) => {
      const has = prev.modules.includes(moduleKey);
      const modules = has ? prev.modules.filter((m) => m !== moduleKey) : [...prev.modules, moduleKey];
      const next = { ...prev, modules };
      saveDraft(next);
      return next;
    });
  }, []);

  const handleSkipToDashboard = useCallback(async () => {
    setIsSkipping(true);
    try {
      const res = await skipOrgSetup({});
      clearBackendTokenCache();
      document.cookie = "org-setup-done=1; path=/; max-age=1800; SameSite=Lax";
      if (res?.autoLoginToken) {
        await signIn("credentials", {
          magicToken: res.autoLoginToken,
          redirect: false,
        }).catch(() => null);
      }
      clearAll();
      window.location.replace("/dashboard");
    } catch {
      setIsSkipping(false);
    }
  }, [skipOrgSetup]);

  useEffect(() => {
    const savedStep = loadStep();
    const savedDraft = loadDraft();
    const savedSequence = getStepSequence(savedDraft.goals);
    if (savedStep >= savedSequence.length) {
      clearAll();
      setStep(1);
      setData({ ...DEFAULT_DATA });
    } else {
      setStep(savedStep);
      setData(savedDraft);
    }
    setMounted(true);
  }, []);

  // Server session is the source of truth for cross-device resume; localStorage above
  // is only the instant-paint cache (per 02_Odoo_Research §"Resume Without Fear").
  useEffect(() => {
    if (!mounted || hydratedFromServerRef.current || !serverSession) return;
    hydratedFromServerRef.current = true;
    if (serverSession.status !== "in_progress" || !serverSession.data) return;
    const serverData = serverSession.data as Partial<WizardData>;
    if (!serverData.goals && !serverData.companyName) return;

    const merged: WizardData = { ...DEFAULT_DATA, ...serverData };
    const mergedSequence = getStepSequence(merged.goals);
    const stepIndex = serverSession.currentStep
      ? Math.max(1, mergedSequence.indexOf(serverSession.currentStep as StepId) + 1)
      : 1;

    setData(merged);
    saveDraft(merged);
    if (stepIndex > 1 && stepIndex <= mergedSequence.length) {
      setStep(stepIndex);
      saveStep(stepIndex);
    }
  }, [mounted, serverSession]);

  useEffect(() => {
    if (session?.orgOnboardingCompletedAt) {
      clearAll();
      window.location.replace("/dashboard");
    }
  }, [session?.orgOnboardingCompletedAt]);

  useEffect(() => {
    if (!mounted) return;
    saveStep(step);
  }, [step, mounted]);

  if (!mounted) {
    return (
      <div className="w-full max-w-sm flex items-center justify-center py-16">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepTitle =
    currentStepId === "welcome"
      ? `Welcome${firstName ? `, ${firstName}` : ""}!`
      : STEP_TITLES[currentStepId];

  return (
    <div className="w-full max-w-sm relative">
      <WizardShell
        step={step}
        totalSteps={totalSteps}
        title={stepTitle}
        direction={direction}
      >
        {currentStepId === "welcome" && (
          <StepWelcome onNext={goNext} onSkip={handleSkipToDashboard} isSkipping={isSkipping} />
        )}
        {currentStepId === "goals" && (
          <StepGoals
            goals={data.goals}
            onToggle={handleToggleGoal}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "industry" && (
          <StepIndustry
            industry={data.industry}
            onSelect={handleSelectIndustry}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "company" && (
          <StepCompany
            data={data}
            patch={patch}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "modules" && (
          <StepModules
            modules={data.modules}
            onToggle={handleToggleModule}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "starting-data" && (
          <StepStartingData
            value={data.startingData}
            onSelect={(startingData) => patch({ startingData })}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "payments" && (
          <StepPayments
            value={data.paymentsChoice}
            onSelect={(paymentsChoice) => patch({ paymentsChoice })}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "invite" && (
          <StepInviteTeam
            invitees={data.invitees}
            onChange={(invitees) => patch({ invitees })}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {currentStepId === "generation" && <StepGeneration data={data} />}
      </WizardShell>
    </div>
  );
}
