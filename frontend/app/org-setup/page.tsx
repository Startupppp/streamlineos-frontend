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
  useOrgSetupSessionQuery,
} from "@/lib/api/hooks/org";
import {
  STEP_TITLES,
  DEFAULT_DATA,
  deriveAppsFromGoals,
  getStepSequence,
  resolveStepIndex,
  toggleGoalSelection,
  type StepId,
} from "@/features/org-setup/lib/constants";
import {
  loadDraft,
  clearAll,
  saveDraft,
  loadStep,
  saveStep,
  clampStep,
  hasDraftProgress,
} from "@/features/org-setup/lib/draft";
import {
  parseWizardDraft,
  type WizardData,
} from "@/features/org-setup/lib/wizard-data-schema";
import { OrgSetupShell } from "@/features/org-setup/components/org-setup-shell";
import { StepWelcome } from "@/features/org-setup/components/step-welcome";
import { StepBasics } from "@/features/org-setup/components/step-basics";
import { StepInviteLaunch } from "@/features/org-setup/components/step-invite-launch";

function syncAppsFromGoals(data: WizardData): WizardData {
  const derived = deriveAppsFromGoals(data.goals);
  return { ...data, installedApps: derived, modules: derived };
}

export default function OrgSetupPage() {
  const { data: session, update } = useSession();
  const { data: serverSession } = useOrgSetupSessionQuery();
  const { mutateAsync: skipOrgSetup } = useSkipOrgSetupMutation();

  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const exitedRef = useRef(false);
  const hydratedFromServerRef = useRef(false);

  const sequence = useMemo(() => getStepSequence(), []);
  const totalSteps = sequence.length;
  const currentStepId: StepId = sequence[step - 1] ?? "welcome";

  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "";

  const markDraftSaved = useCallback(() => {
    setSaveState("saved");
  }, []);

  const patch = useCallback(
    (updates: Partial<WizardData>) => {
      setData((prev) => {
        const next = { ...prev, ...updates };
        saveDraft(next);
        return next;
      });
      markDraftSaved();
    },
    [markDraftSaved],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, totalSteps));
    markDraftSaved();
  }, [totalSteps, markDraftSaved]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleStepSelect = useCallback((index: number) => {
    setDirection(-1);
    setStep(index + 1);
  }, []);

  const handleToggleGoal = useCallback(
    (id: string) => {
      setData((prev) => {
        const newGoals = toggleGoalSelection(prev.goals, id);
        const next = syncAppsFromGoals({ ...prev, goals: newGoals });
        saveDraft(next);
        return next;
      });
      markDraftSaved();
    },
    [markDraftSaved],
  );

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
    const savedDraft = syncAppsFromGoals(loadDraft());
    const savedSequence = getStepSequence();
    const restoredStep = clampStep(loadStep(), savedSequence.length);
    setData(savedDraft);
    saveDraft(savedDraft);
    setStep(restoredStep);
    saveStep(restoredStep);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || hydratedFromServerRef.current || !serverSession) return;
    hydratedFromServerRef.current = true;

    const localDraft = loadDraft();
    if (hasDraftProgress(localDraft)) return;
    if (serverSession.status !== "in_progress" || !serverSession.data) return;

    const merged = syncAppsFromGoals(parseWizardDraft(serverSession.data));
    if (!hasDraftProgress(merged)) return;

    const mergedSequence = getStepSequence();
    const stepFromServer = resolveStepIndex(
      serverSession.currentStep,
      mergedSequence,
    );
    const restoredStep =
      stepFromServer >= 1
        ? clampStep(stepFromServer, mergedSequence.length)
        : clampStep(loadStep(), mergedSequence.length);

    setData(merged);
    saveDraft(merged);
    setStep(restoredStep);
    saveStep(restoredStep);
  }, [mounted, serverSession]);

  useEffect(() => {
    if (exitedRef.current) return;
    if (session?.orgId || session?.orgOnboardingCompletedAt) {
      exitedRef.current = true;
      clearAll();
      void completeOnboardingGate("org-setup-done", update);
      window.location.replace("/dashboard");
    }
  }, [session?.orgId, session?.orgOnboardingCompletedAt, update]);

  useEffect(() => {
    if (!mounted) return;
    saveStep(step);
  }, [step, mounted]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 4000);
    return () => clearTimeout(timeout);
  }, [saveState]);

  if (!mounted)
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
      saveState={saveState}
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
      {currentStepId === "invite" && (
        <StepInviteLaunch
          data={data}
          onBack={goBack}
          onChangeInvitees={(invitees) => patch({ invitees })}
        />
      )}
    </OrgSetupShell>
  );
}
