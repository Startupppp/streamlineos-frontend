"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { PersonalInfoTab } from "@/features/onboarding/components/personal-info-tab";
import { BankDetailsTab } from "@/features/onboarding/components/bank-details-tab";
import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { ReviewTab } from "@/features/onboarding/components/review-tab";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useOnboardingSessionQuery,
  usePatchOnboardingSessionMutation,
} from "@/hooks/api/onboarding-flow";

import type { Variants } from "framer-motion";

const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  DOCS: "docs",
  REVIEW: "finish",
} as const;

type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

const VALID_STEP_IDS: ReadonlySet<string> = new Set(Object.values(STEP_IDS));

function isStepId(value: string): value is StepId {
  return VALID_STEP_IDS.has(value);
}

const DATA_STEPS = [
  { id: STEP_IDS.PERSONAL, label: "Personal Info", icon: User },
  { id: STEP_IDS.BANK, label: "Bank Details", icon: Landmark },
  { id: STEP_IDS.DOCS, label: "Documents", icon: FileText },
] as const;

const REVIEW_STEP = {
  id: STEP_IDS.REVIEW,
  label: "Review & Sign",
  icon: ClipboardCheck,
} as const;

const ONBOARDING_STEPS = [...DATA_STEPS, REVIEW_STEP];

type FormValues = Record<string, string | undefined>;

const fadeUpVariants = fadeUp as Variants;

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState<StepId>(STEP_IDS.PERSONAL);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [savedFormData, setSavedFormData] = useState<
    Record<string, FormValues>
  >({});
  const hydratedFromSessionRef = useRef(false);

  const { data: session } = useOnboardingSessionQuery();
  const { mutate: patchSession } = usePatchOnboardingSessionMutation();

  // Server session is the resume source of truth (survives refresh/device switch);
  // per-tab data itself is already saved server-side by each tab's own mutation.
  useEffect(() => {
    if (hydratedFromSessionRef.current || !session) return;
    hydratedFromSessionRef.current = true;
    if (session.completedSteps?.length) {
      setCompletedSteps(new Set(session.completedSteps));
    }
    if (session.currentStep && isStepId(session.currentStep)) {
      setActiveTab(session.currentStep);
    }
  }, [session]);

  const currentStepIndex = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((s) => s.id === activeTab),
  );
  const progressPercentage =
    DATA_STEPS.length > 0
      ? Math.round((completedSteps.size / DATA_STEPS.length) * 100)
      : 0;

  const handlePersonalComplete = useCallback((values?: FormValues) => {
    if (values) setSavedFormData((prev) => ({ ...prev, [STEP_IDS.PERSONAL]: values }));
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(STEP_IDS.PERSONAL);
      patchSession({ currentStep: STEP_IDS.BANK, completedSteps: Array.from(next) });
      return next;
    });
    setActiveTab(STEP_IDS.BANK);
  }, [patchSession]);

  const handleBankComplete = useCallback((values?: FormValues) => {
    if (values) setSavedFormData((prev) => ({ ...prev, [STEP_IDS.BANK]: values }));
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(STEP_IDS.BANK);
      patchSession({ currentStep: STEP_IDS.DOCS, completedSteps: Array.from(next) });
      return next;
    });
    setActiveTab(STEP_IDS.DOCS);
  }, [patchSession]);

  const handleDocsComplete = useCallback((values?: FormValues) => {
    if (values) setSavedFormData((prev) => ({ ...prev, [STEP_IDS.DOCS]: values }));
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(STEP_IDS.DOCS);
      patchSession({ currentStep: STEP_IDS.REVIEW, completedSteps: Array.from(next) });
      return next;
    });
    setActiveTab(STEP_IDS.REVIEW);
  }, [patchSession]);

  const handleGoToPersonal = useCallback(() => setActiveTab(STEP_IDS.PERSONAL), []);
  const handleGoToBank = useCallback(() => setActiveTab(STEP_IDS.BANK), []);
  const handleGoToDocs = useCallback(() => setActiveTab(STEP_IDS.DOCS), []);

  const handleTabChange = useCallback((v: string) => {
    if (isStepId(v)) setActiveTab(v);
  }, []);

  const handleStepClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const stepId = e.currentTarget.dataset.stepId;
    if (stepId && isStepId(stepId)) setActiveTab(stepId);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}: ${ONBOARDING_STEPS[currentStepIndex]?.label}`}
      </div>

      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 pt-4 pb-4 space-y-3">
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-[-0.02em] text-foreground">
                Employee Onboarding
              </h1>
              <p className="text-sm text-slate-600">
                Complete your profile to get started · Step{" "}
                {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
              </p>
            </div>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {progressPercentage}%
            </span>
          </div>
        </motion.div>

        <nav aria-label="Onboarding steps">
          <ol className="flex items-center gap-0">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === activeTab;
              const isPast = index < currentStepIndex;

              return (
                <li
                  key={step.id}
                  className="flex items-center flex-1 last:flex-initial min-w-0"
                >
                  <button
                    type="button"
                    data-step-id={step.id}
                    onClick={handleStepClick}
                    className="flex flex-col items-center gap-1 group rounded-lg py-1 px-1.5 min-w-0"
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isCompleted ? " (completed)" : ""}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isCurrent
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-muted border-border text-muted-foreground group-hover:border-primary/50"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium text-center leading-tight hidden sm:block ${
                        isCurrent
                          ? "text-primary"
                          : isCompleted
                            ? "text-emerald-600"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 mt-[-0.75rem] hidden sm:block transition-colors ${
                        isPast || (isCompleted && index < currentStepIndex)
                          ? "bg-emerald-500"
                          : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsContent value={STEP_IDS.PERSONAL}>
                  <PersonalInfoTab
                    onComplete={handlePersonalComplete}
                    defaultValues={savedFormData[STEP_IDS.PERSONAL]}
                  />
                </TabsContent>
                <TabsContent value={STEP_IDS.BANK}>
                  <BankDetailsTab
                    onComplete={handleBankComplete}
                    onBack={handleGoToPersonal}
                    defaultValues={savedFormData[STEP_IDS.BANK]}
                  />
                </TabsContent>
                <TabsContent value={STEP_IDS.DOCS}>
                  <EmployeeDocumentsTab
                    onContinue={handleDocsComplete}
                    onBack={handleGoToBank}
                  />
                </TabsContent>
                <TabsContent value={STEP_IDS.REVIEW}>
                  <ReviewTab
                    completedSteps={completedSteps}
                    steps={ONBOARDING_STEPS}
                    reviewStepId={STEP_IDS.REVIEW}
                    onBack={handleGoToDocs}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
