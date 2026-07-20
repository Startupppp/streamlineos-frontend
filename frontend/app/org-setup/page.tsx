"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { clearBackendTokenCache } from "@/lib/api-client";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { signInWithMagicToken } from "@/hooks/common/auth-hooks";
import {
  useSkipOrgSetupMutation,
  usePatchOrgSetupSessionMutation,
  useOrgSetupSessionQuery,
  useModuleRecommendationsMutation,
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
import { OrgSetupShell } from "@/features/org-setup/components/org-setup-shell";
import { StepWelcome } from "@/features/org-setup/components/step-welcome";
import { StepBasics } from "@/features/org-setup/components/step-basics";
import { StepSetup } from "@/features/org-setup/components/step-setup";
import { StepInviteLaunch } from "@/features/org-setup/components/step-invite-launch";

export default function OrgSetupPage() {
  const { data: session, update } = useSession();
  const { mutateAsync: skipOrgSetup } = useSkipOrgSetupMutation();
  const { mutate: patchSession, isPending: isSaving } = usePatchOrgSetupSessionMutation();
  const { data: serverSession } = useOrgSetupSessionQuery();
  const { mutate: fetchModuleRecommendations } = useModuleRecommendationsMutation();

  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });
  const [recommendedReasons, setRecommendedReasons] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const hydratedFromServerRef = useRef(false);
  const recommendationsFetchedRef = useRef(false);

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
      setSaveState("saving");
      patchSession(
        { currentStep: stepId, data: snapshot },
        { onSuccess: () => setSaveState("saved"), onError: () => setSaveState("idle") },
      );
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

  const handleStepSelect = useCallback((index: number) => {
    setDirection(-1);
    setStep(index + 1);
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
      if (res?.autoLoginToken) {
        await signInWithMagicToken(res.autoLoginToken);
      }
      await completeOnboardingGate("org-setup-done", update);
      clearAll();
      window.location.replace("/dashboard");
    } catch {
      setIsSkipping(false);
    }
  }, [skipOrgSetup, update]);

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

  useEffect(() => {
    if (currentStepId !== "setup" || recommendationsFetchedRef.current || data.goals.length === 0) {
      return;
    }
    recommendationsFetchedRef.current = true;
    fetchModuleRecommendations(
      { goals: data.goals, industry: data.industry || undefined },
      {
        onSuccess: (res) => {
          const reasons: Record<string, string> = {};
          for (const rec of res.recommendedModules) reasons[rec.moduleKey] = rec.reason;
          setRecommendedReasons(reasons);
        },
      },
    );
  }, [currentStepId, data.goals, data.industry, fetchModuleRecommendations]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 4000);
    return () => clearTimeout(timeout);
  }, [saveState]);

  if (!mounted) {
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

  const stepTitle =
    currentStepId === "welcome"
      ? `Welcome${firstName ? `, ${firstName}` : ""}`
      : STEP_TITLES[currentStepId];

  return (
    <OrgSetupShell
      sequence={sequence}
      currentIndex={step - 1}
      title={stepTitle}
      direction={direction}
      saveState={isSaving ? "saving" : saveState}
      data={data}
      onStepSelect={handleStepSelect}
    >
      {currentStepId === "welcome" && (
        <StepWelcome
          onNext={goNext}
          onSkip={handleSkipToDashboard}
          isSkipping={isSkipping}
          firstName={firstName}
        />
      )}
      {currentStepId === "basics" && (
        <StepBasics
          data={data}
          patch={patch}
          onToggleGoal={handleToggleGoal}
          onBack={goBack}
          onNext={goNext}
        />
      )}
      {currentStepId === "setup" && (
        <StepSetup
          data={data}
          recommendedReasons={recommendedReasons}
          onToggleModule={handleToggleModule}
          patch={patch}
          onBack={goBack}
          onNext={goNext}
        />
      )}
      {currentStepId === "invite" && (
        <StepInviteLaunch
          data={data}
          onChangeInvitees={(invitees) => patch({ invitees })}
          onBack={goBack}
        />
      )}
    </OrgSetupShell>
  );
}
