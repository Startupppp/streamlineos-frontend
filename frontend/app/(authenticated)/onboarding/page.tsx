"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonalInfoTab } from "@/features/onboarding/components/personal-info-tab";
import { BankDetailsTab } from "@/features/onboarding/components/bank-details-tab";
import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { ReviewTab } from "@/features/onboarding/components/review-tab";
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

function stepIndexOf(id: StepId): number {
  return Math.max(0, ONBOARDING_STEPS.findIndex((s) => s.id === id));
}

export default function OnboardingPage() {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<StepId>(STEP_IDS.PERSONAL);
  const [direction, setDirection] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [savedFormData, setSavedFormData] = useState<
    Record<string, FormValues>
  >({});
  const [sessionHydrated, setSessionHydrated] = useState(false);

  const { data: session } = useOnboardingSessionQuery();
  const { mutate: patchSession } = usePatchOnboardingSessionMutation();

  if (!sessionHydrated && session) {
    setSessionHydrated(true);
    if (session.completedSteps?.length) {
      setCompletedSteps(new Set(session.completedSteps));
    }
    if (session.currentStep && isStepId(session.currentStep)) {
      setActiveTab(session.currentStep);
    }
  }

  const currentStepIndex = stepIndexOf(activeTab);
  const progressPercentage =
    DATA_STEPS.length > 0
      ? Math.round((completedSteps.size / DATA_STEPS.length) * 100)
      : 0;

  const navigateTo = useCallback(
    (id: StepId) => {
      setDirection(stepIndexOf(id) >= stepIndexOf(activeTab) ? 1 : -1);
      setActiveTab(id);
    },
    [activeTab],
  );

  const handlePersonalComplete = useCallback((values?: FormValues) => {
    if (values) setSavedFormData((prev) => ({ ...prev, [STEP_IDS.PERSONAL]: values }));
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(STEP_IDS.PERSONAL);
      patchSession({ currentStep: STEP_IDS.BANK, completedSteps: Array.from(next) });
      return next;
    });
    setDirection(1);
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
    setDirection(1);
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
    setDirection(1);
    setActiveTab(STEP_IDS.REVIEW);
  }, [patchSession]);

  const handleGoToPersonal = useCallback(() => navigateTo(STEP_IDS.PERSONAL), [navigateTo]);
  const handleGoToBank = useCallback(() => navigateTo(STEP_IDS.BANK), [navigateTo]);
  const handleGoToDocs = useCallback(() => navigateTo(STEP_IDS.DOCS), [navigateTo]);

  const reachableSteps = useMemo(() => {
    const firstIncompleteDataStep = DATA_STEPS.find((s) => !completedSteps.has(s.id));
    const reachable = new Set<string>(completedSteps);
    reachable.add(firstIncompleteDataStep ? firstIncompleteDataStep.id : STEP_IDS.REVIEW);
    reachable.add(activeTab);
    return reachable;
  }, [completedSteps, activeTab]);

  const handleStepClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const stepId = e.currentTarget.dataset.stepId;
    if (stepId && isStepId(stepId) && reachableSteps.has(stepId)) navigateTo(stepId);
  }, [navigateTo, reachableSteps]);

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

      <div className="shrink-0 border-b bg-background px-4 sm:px-6 lg:px-8 pt-4 pb-4 space-y-3">
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
              <p className="text-sm text-muted-foreground">
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
              const isReachable = reachableSteps.has(step.id);

              return (
                <li
                  key={step.id}
                  className="flex items-center flex-1 last:flex-initial min-w-0"
                >
                  <button
                    type="button"
                    data-step-id={step.id}
                    onClick={handleStepClick}
                    disabled={!isReachable}
                    className={cn(
                      "flex flex-col items-center gap-1 group rounded-lg py-1 px-1.5 min-w-0",
                      isReachable && !isCurrent && "press-scale",
                      !isReachable && "cursor-not-allowed opacity-70",
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isCompleted ? " (completed)" : ""}`}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0",
                        "transition-[background-color,border-color,color] duration-200",
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : isCurrent
                            ? "bg-brand-core border-brand-core text-white"
                            : cn(
                                "bg-muted border-border text-muted-foreground",
                                isReachable && "group-hover:border-brand-core/50",
                              ),
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <StepIcon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium text-center leading-tight",
                        isCurrent ? "block" : "hidden sm:block",
                        "transition-colors duration-200",
                        isCurrent
                          ? "text-brand-deep dark:text-brand-bright"
                          : isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div
                      className="relative flex-1 h-0.5 mx-1 mt-[-0.75rem] hidden sm:block rounded-full bg-border overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={activeTab}
                  custom={direction}
                  variants={{
                    initial: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * 24 }),
                    animate: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.22, ease: "easeOut" },
                    },
                    exit: (d: number) => ({
                      opacity: 0,
                      x: reduceMotion ? 0 : d * -24,
                      transition: { duration: 0.15, ease: "easeOut" },
                    }),
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {activeTab === STEP_IDS.PERSONAL && (
                    <PersonalInfoTab
                      onComplete={handlePersonalComplete}
                      defaultValues={savedFormData[STEP_IDS.PERSONAL]}
                    />
                  )}
                  {activeTab === STEP_IDS.BANK && (
                    <BankDetailsTab
                      onComplete={handleBankComplete}
                      onBack={handleGoToPersonal}
                      defaultValues={savedFormData[STEP_IDS.BANK]}
                    />
                  )}
                  {activeTab === STEP_IDS.DOCS && (
                    <EmployeeDocumentsTab
                      onContinue={handleDocsComplete}
                      onBack={handleGoToBank}
                    />
                  )}
                  {activeTab === STEP_IDS.REVIEW && (
                    <ReviewTab
                      completedSteps={completedSteps}
                      steps={ONBOARDING_STEPS}
                      reviewStepId={STEP_IDS.REVIEW}
                      onBack={handleGoToDocs}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
