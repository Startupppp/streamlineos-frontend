"use client";

import { useState, useCallback, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOrgSettings } from "@/hooks/api/organization";
import { WelcomeStep } from "@/features/workspace-onboarding/steps/welcome-step";
import { GoalsStep } from "@/features/workspace-onboarding/steps/goals-step";
import { IndustryStep } from "@/features/workspace-onboarding/steps/industry-step";
import { CompanyProfileStep } from "@/features/workspace-onboarding/steps/company-profile-step";
import { GenerationStep } from "@/features/workspace-onboarding/steps/generation-step";
import { RecommendationsStep } from "@/features/workspace-onboarding/steps/recommendations-step";
import { InviteStep } from "@/features/workspace-onboarding/steps/invite-step";
import { SuccessStep } from "@/features/workspace-onboarding/steps/success-step";
import type { CompanyProfileData } from "@/features/workspace-onboarding/types";
import {
  WIZARD_DEFAULTS,
  loadWizardState,
  saveWizardState,
  clearWizardState,
  type WizardState,
} from "@/features/workspace-onboarding/wizard-storage";

const STEP_LABELS = [
  "Welcome",
  "Goals",
  "Industry",
  "Company Profile",
  "Building Workspace",
  "Recommendations",
  "Invite Team",
  "All Done",
];

const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
};

export default function SetupPage() {
  const router = useRouter();
  const [direction, setDirection] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>(WIZARD_DEFAULTS);

  const { data: orgSettings, isLoading } = useOrgSettings({ retry: false });

  useEffect(() => {
    if (!orgSettings) return;
    if (orgSettings.onboardingCompletedAt) {
      clearWizardState();
      router.replace("/dashboard");
      return;
    }
    const stored = loadWizardState();
    const patched: WizardState = { ...stored };
    if (orgSettings.name && !stored.orgName) patched.orgName = orgSettings.name;
    if (orgSettings.industry && !stored.industry) {
      patched.industry = orgSettings.industry;
      if (stored.currentStep < 4) patched.currentStep = 4;
    }
    saveWizardState(patched);
    startTransition(() => setWizardState(patched));
  }, [orgSettings, router]);

  const update = useCallback((patch: Partial<WizardState>) => {
    setWizardState((prev) => {
      const next = { ...prev, ...patch };
      saveWizardState(next);
      return next;
    });
  }, []);

  const goToStep = useCallback(
    (step: number, dir: number) => {
      setDirection(dir);
      update({ currentStep: step });
    },
    [update],
  );

  const handleWelcomeStart = useCallback(() => goToStep(1, 1), [goToStep]);
  const handleWelcomeSkip = useCallback(() => router.push("/dashboard"), [router]);

  const handleGoalsNext = useCallback(
    (goals: string[]) => { update({ goals }); goToStep(2, 1); },
    [update, goToStep],
  );
  const handleGoalsBack = useCallback(() => goToStep(0, -1), [goToStep]);

  const handleIndustryNext = useCallback(
    (industry: string) => { update({ industry }); goToStep(3, 1); },
    [update, goToStep],
  );
  const handleIndustryBack = useCallback(() => goToStep(1, -1), [goToStep]);

  const handleCompanyProfileNext = useCallback(
    (data: CompanyProfileData) => { update({ orgName: data.name }); goToStep(4, 1); },
    [update, goToStep],
  );
  const handleCompanyProfileBack = useCallback(() => goToStep(2, -1), [goToStep]);

  const handleGenerationComplete = useCallback(() => goToStep(5, 1), [goToStep]);

  const handleRecommendationsNext = useCallback(
    (installedModules: string[]) => { update({ installedModules }); goToStep(6, 1); },
    [update, goToStep],
  );
  const handleRecommendationsBack = useCallback(() => goToStep(4, -1), [goToStep]);

  const handleInviteNext = useCallback(
    (teamMembersInvited: number) => { update({ teamMembersInvited }); goToStep(7, 1); },
    [update, goToStep],
  );
  const handleInviteSkip = useCallback(() => goToStep(7, 1), [goToStep]);
  const handleInviteBack = useCallback(() => goToStep(5, -1), [goToStep]);

  const handleEnterWorkspace = useCallback(() => {
    clearWizardState();
    router.push("/dashboard");
  }, [router]);

  const handleSaveAndExit = useCallback(() => router.push("/dashboard"), [router]);

  const { currentStep, goals, industry, orgName, installedModules, teamMembersInvited } = wizardState;
  const progressPercent = (currentStep / (STEP_LABELS.length - 1)) * 100;
  const showTopBar = currentStep > 0 && currentStep < STEP_LABELS.length - 1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showTopBar && (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                {STEP_LABELS[currentStep]}
              </span>
            </div>
            <Progress value={progressPercent} className="flex-1 h-1.5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveAndExit}
              className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
            >
              Save & exit
            </Button>
          </div>
        </header>
      )}

      <main className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {currentStep === 0 && (
                <WelcomeStep onStart={handleWelcomeStart} onSkip={handleWelcomeSkip} />
              )}
              {currentStep === 1 && (
                <GoalsStep onNext={handleGoalsNext} onBack={handleGoalsBack} defaultGoals={goals} />
              )}
              {currentStep === 2 && (
                <IndustryStep onNext={handleIndustryNext} onBack={handleIndustryBack} defaultIndustry={industry} />
              )}
              {currentStep === 3 && (
                <CompanyProfileStep onNext={handleCompanyProfileNext} onBack={handleCompanyProfileBack} />
              )}
              {currentStep === 4 && (
                <GenerationStep orgName={orgName} industry={industry} onComplete={handleGenerationComplete} />
              )}
              {currentStep === 5 && (
                <RecommendationsStep
                  goals={goals}
                  industry={industry}
                  onNext={handleRecommendationsNext}
                  onBack={handleRecommendationsBack}
                />
              )}
              {currentStep === 6 && (
                <InviteStep onNext={handleInviteNext} onSkip={handleInviteSkip} onBack={handleInviteBack} />
              )}
              {currentStep === 7 && (
                <SuccessStep
                  summary={{ industry, modulesInstalled: installedModules, teamMembersInvited, workspaceCreated: true }}
                  onEnter={handleEnterWorkspace}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
