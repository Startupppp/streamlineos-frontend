"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { clearBackendTokenCache } from "@/lib/api-client";
import { useOrgSetupMutation } from "@/lib/api/hooks/org";
import {
  TOTAL_STEPS,
  STEP_TITLES,
  DEFAULT_DATA,
  deriveAppsFromGoals,
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
import { StepGeneration } from "@/features/org-setup/components/step-generation";

export default function OrgSetupPage() {
  const { data: session } = useSession();
  const { mutateAsync: setupOrg } = useOrgSetupMutation();

  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA });

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
      const newGoals = has
        ? prev.goals.filter((g) => g !== id)
        : [...prev.goals, id];
      const next = {
        ...prev,
        goals: newGoals,
        installedApps: deriveAppsFromGoals(newGoals),
      };
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

  const handleSkipToDashboard = useCallback(async () => {
    setIsSkipping(true);
    try {
      const res = await setupOrg({
        industry: "IT Services",
        companySize: "1-10",
        enabledModules: ["HR", "CRM", "PROJECTS"],
      });
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
  }, [setupOrg]);

  const sessionCheckCalledRef = useRef(false);

  useEffect(() => {
    const savedStep = loadStep();
    if (savedStep >= TOTAL_STEPS) {
      clearAll();
      setStep(1);
      setData({ ...DEFAULT_DATA });
    } else {
      setStep(savedStep);
      setData(loadDraft());
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionCheckCalledRef.current) return;
    sessionCheckCalledRef.current = true;
    fetch("/api/auth/session")
      .then(r => r.json() as Promise<{ orgOnboardingCompletedAt?: string | null } | null>)
      .then(s => {
        if (s?.orgOnboardingCompletedAt) {
          clearAll();
          window.location.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, []);

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
    step === 1
      ? `Welcome${firstName ? `, ${firstName}` : ""}!`
      : (STEP_TITLES[step - 1] ?? "");

  return (
    <div className="w-full max-w-sm relative">
      <WizardShell
        step={step}
        totalSteps={TOTAL_STEPS}
        title={stepTitle}
        direction={direction}
      >
        {step === 1 && (
          <StepWelcome onNext={goNext} onSkip={handleSkipToDashboard} isSkipping={isSkipping} />
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
            onNext={goNext}
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
        {step === 5 && <StepGeneration data={data} />}
      </WizardShell>
    </div>
  );
}
