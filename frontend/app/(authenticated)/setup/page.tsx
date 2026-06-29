"use client";

import { useState, useCallback, useEffect } from "react";
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

const TOTAL_STEPS = 8;

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
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [goals, setGoals] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [orgName, setOrgName] = useState("");
  const [installedModules, setInstalledModules] = useState<string[]>([]);
  const [teamMembersInvited, setTeamMembersInvited] = useState(0);

  const { data: orgSettings, isLoading: isLoadingSettings } = useOrgSettings({
    retry: false,
  });

  useEffect(() => {
    if (!orgSettings) return;
    if (orgSettings.onboardingCompletedAt) {
      router.replace("/dashboard");
      return;
    }
    if (orgSettings.name) {
      setOrgName(orgSettings.name);
    }
    if (orgSettings.industry) {
      setIndustry(orgSettings.industry);
      setDirection(1);
      setCurrentStep(4);
    }
  }, [orgSettings, router]);

  const goToStep = useCallback((step: number, dir: number) => {
    setDirection(dir);
    setCurrentStep(step);
  }, []);

  const handleWelcomeStart = useCallback(() => {
    goToStep(1, 1);
  }, [goToStep]);

  const handleWelcomeSkip = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleGoalsNext = useCallback(
    (selectedGoals: string[]) => {
      setGoals(selectedGoals);
      goToStep(2, 1);
    },
    [goToStep],
  );

  const handleGoalsBack = useCallback(() => {
    goToStep(0, -1);
  }, [goToStep]);

  const handleIndustryNext = useCallback(
    (selectedIndustry: string) => {
      setIndustry(selectedIndustry);
      goToStep(3, 1);
    },
    [goToStep],
  );

  const handleIndustryBack = useCallback(() => {
    goToStep(1, -1);
  }, [goToStep]);

  const handleCompanyProfileNext = useCallback(
    (data: CompanyProfileData) => {
      setOrgName(data.name);
      goToStep(4, 1);
    },
    [goToStep],
  );

  const handleCompanyProfileBack = useCallback(() => {
    goToStep(2, -1);
  }, [goToStep]);

  const handleGenerationComplete = useCallback(() => {
    goToStep(5, 1);
  }, [goToStep]);

  const handleRecommendationsNext = useCallback(
    (installed: string[]) => {
      setInstalledModules(installed);
      goToStep(6, 1);
    },
    [goToStep],
  );

  const handleRecommendationsBack = useCallback(() => {
    goToStep(4, -1);
  }, [goToStep]);

  const handleInviteNext = useCallback(
    (sent: number) => {
      setTeamMembersInvited(sent);
      goToStep(7, 1);
    },
    [goToStep],
  );

  const handleInviteSkip = useCallback(() => {
    goToStep(7, 1);
  }, [goToStep]);

  const handleInviteBack = useCallback(() => {
    goToStep(5, -1);
  }, [goToStep]);

  const handleEnterWorkspace = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleSaveAndExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const progressPercent = (currentStep / (TOTAL_STEPS - 1)) * 100;
  const showTopBar = currentStep > 0 && currentStep < TOTAL_STEPS - 1;

  if (isLoadingSettings) {
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
                <GoalsStep
                  onNext={handleGoalsNext}
                  onBack={handleGoalsBack}
                  defaultGoals={goals}
                />
              )}
              {currentStep === 2 && (
                <IndustryStep
                  onNext={handleIndustryNext}
                  onBack={handleIndustryBack}
                  defaultIndustry={industry}
                />
              )}
              {currentStep === 3 && (
                <CompanyProfileStep
                  onNext={handleCompanyProfileNext}
                  onBack={handleCompanyProfileBack}
                />
              )}
              {currentStep === 4 && (
                <GenerationStep
                  orgName={orgName}
                  industry={industry}
                  onComplete={handleGenerationComplete}
                />
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
                <InviteStep
                  onNext={handleInviteNext}
                  onSkip={handleInviteSkip}
                  onBack={handleInviteBack}
                />
              )}
              {currentStep === 7 && (
                <SuccessStep
                  summary={{
                    industry,
                    modulesInstalled: installedModules,
                    teamMembersInvited,
                    workspaceCreated: true,
                  }}
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
