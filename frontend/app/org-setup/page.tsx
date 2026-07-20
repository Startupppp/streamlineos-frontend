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
import type { WizardData } from "@/features/org-setup/lib/types";
import { OrgSetupShell } from "@/features/org-setup/components/org-setup-shell";
import { StepWelcome } from "@/features/org-setup/components/step-welcome";
import { StepBasics } from "@/features/org-setup/components/step-basics";
import { StepInviteLaunch } from "@/features/org-setup/components/step-invite-launch";

function syncAppsFromGoals(data: WizardData): WizardData {
  const derived = deriveAppsFromGoals(data.goals);
  return { ...data, installedApps: derived, modules: derived };
}

function parseServerWizardData(
  raw: Record<string, unknown>,
): Partial<WizardData> {
  const next: Partial<WizardData> = {};
  if (Array.isArray(raw.goals))
    next.goals = raw.goals.filter((g): g is string => typeof g === "string");

  if (typeof raw.industry === "string") next.industry = raw.industry;
  if (typeof raw.companyName === "string") next.companyName = raw.companyName;
  if (typeof raw.teamSize === "string") next.teamSize = raw.teamSize;
  if (typeof raw.country === "string") next.country = raw.country;
  if (typeof raw.timezone === "string") next.timezone = raw.timezone;
  if (typeof raw.phone === "string") next.phone = raw.phone;
  if (typeof raw.currency === "string") next.currency = raw.currency;
  if (typeof raw.fiscalYearStart === "string")
    next.fiscalYearStart = raw.fiscalYearStart;
  if (typeof raw.businessAddress === "string")
    next.businessAddress = raw.businessAddress;
  if (typeof raw.taxId === "string") next.taxId = raw.taxId;
  if (Array.isArray(raw.installedApps)) {
    next.installedApps = raw.installedApps.filter(
      (m): m is string => typeof m === "string",
    );
  }
  if (Array.isArray(raw.modules)) {
    next.modules = raw.modules.filter(
      (m): m is string => typeof m === "string",
    );
  }
  if (
    raw.startingData === "clean" ||
    raw.startingData === "sample" ||
    raw.startingData === "import"
  ) {
    next.startingData = raw.startingData;
  }
  if (Array.isArray(raw.invitees)) {
    next.invitees = raw.invitees.filter(
      (v): v is WizardData["invitees"][number] =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as { email?: unknown }).email === "string" &&
        typeof (v as { role?: unknown }).role === "string",
    );
  }
  return next;
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const exitedRef = useRef(false);
  const hydratedFromServerRef = useRef(false);

  const sequence = useMemo(() => getStepSequence(data.goals), [data.goals]);
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
    const savedSequence = getStepSequence(savedDraft.goals);
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

    const serverData = parseServerWizardData(serverSession.data);
    const merged = syncAppsFromGoals({ ...DEFAULT_DATA, ...serverData });
    if (!hasDraftProgress(merged)) return;

    const mergedSequence = getStepSequence(merged.goals);
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
