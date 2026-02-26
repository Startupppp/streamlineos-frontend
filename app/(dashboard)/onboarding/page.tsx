"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PersonalInfoTab } from "./_components/personal-info-tab";
import { BankDetailsTab } from "./_components/bank-details-tab";
import { DocumentsTab } from "./_components/documents-tab";
import { ReviewTab } from "./_components/review-tab";

export const STEP_IDS = {
  PERSONAL: "personal",
  BANK: "bank",
  DOCS: "docs",
  REVIEW: "finish",
} as const;

export type StepId = (typeof STEP_IDS)[keyof typeof STEP_IDS];

const VALID_STEP_IDS: ReadonlySet<string> = new Set(Object.values(STEP_IDS));

function isStepId(value: string): value is StepId {
  return VALID_STEP_IDS.has(value);
}

const NEXT_STEP: Partial<Record<StepId, StepId>> = {
  [STEP_IDS.PERSONAL]: STEP_IDS.BANK,
  [STEP_IDS.BANK]: STEP_IDS.DOCS,
  [STEP_IDS.DOCS]: STEP_IDS.REVIEW,
};

const DATA_STEPS = [
  { id: STEP_IDS.PERSONAL, label: "Personal Info", icon: User },
  { id: STEP_IDS.BANK, label: "Bank Details", icon: Landmark },
  { id: STEP_IDS.DOCS, label: "Documents", icon: FileText },
] as const;

const REVIEW_STEP = { id: STEP_IDS.REVIEW, label: "Review & Sign", icon: ClipboardCheck } as const;

export const ONBOARDING_STEPS = [...DATA_STEPS, REVIEW_STEP];

type FormValues = Record<string, string | undefined>;

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState<StepId>(STEP_IDS.PERSONAL);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [savedFormData, setSavedFormData] = useState<Record<string, FormValues>>({});
  const tabContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = tabContentRef.current;
      if (!container) return;
      const firstInput = container.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="file"]), select, textarea',
      );
      firstInput?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const currentStepIndex = Math.max(0, ONBOARDING_STEPS.findIndex((s) => s.id === activeTab));
  const progressPercentage = useMemo(
    () => DATA_STEPS.length > 0
      ? Math.round((completedSteps.size / DATA_STEPS.length) * 100)
      : 0,
    [completedSteps.size],
  );
  const completeHandlers = useMemo(() => {
    const makeHandler = (stepId: StepId) => (values?: FormValues) => {
      if (values) {
        setSavedFormData((prev) => ({ ...prev, [stepId]: values }));
      }
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(stepId);
        return next;
      });
      const next = NEXT_STEP[stepId];
      if (next) setActiveTab(next);
    };
    return {
      [STEP_IDS.PERSONAL]: makeHandler(STEP_IDS.PERSONAL),
      [STEP_IDS.BANK]: makeHandler(STEP_IDS.BANK),
      [STEP_IDS.DOCS]: makeHandler(STEP_IDS.DOCS),
    } as const;
  }, []);

  const goToHandlers = useMemo(() => ({
    [STEP_IDS.PERSONAL]: () => setActiveTab(STEP_IDS.PERSONAL),
    [STEP_IDS.BANK]: () => setActiveTab(STEP_IDS.BANK),
    [STEP_IDS.DOCS]: () => setActiveTab(STEP_IDS.DOCS),
  }), []);

  const handleTabChange = useMemo(() => {
    return (v: string) => { if (isStepId(v)) setActiveTab(v); };
  }, []);

  return (
    <motion.div
      className="max-w-4xl mx-auto py-4 md:py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}: ${ONBOARDING_STEPS[currentStepIndex]?.label}`}
      </div>

      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-2">Complete your profile to get started with Vaivamm Capital.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-8">
        <ProgressBar value={progressPercentage} ariaLabel="Onboarding progress" stepText={`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}`} />
      </motion.div>

      <motion.div variants={fadeUp} className="mb-8">
        <nav aria-label="Onboarding steps">
          <ol className="flex items-center justify-between">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = step.id === activeTab;
              const isPast = index < currentStepIndex;

              return (
                <li key={step.id} className="flex items-center flex-1 last:flex-initial">
                  <button
                    type="button"
                    onClick={() => setActiveTab(step.id)}
                    className="flex flex-col items-center gap-1.5 group p-2 -m-2 rounded-lg"
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${step.label}${isCompleted ? " (completed)" : ""}`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted border-border text-muted-foreground group-hover:border-primary/50"
                    }`}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-medium ${
                        isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${isPast || isCompleted ? "bg-green-500" : "bg-border"}`} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </motion.div>

      <motion.div variants={fadeUp}>
      <div ref={tabContentRef}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsContent value={STEP_IDS.PERSONAL}>
          <PersonalInfoTab
            onComplete={completeHandlers[STEP_IDS.PERSONAL]}
            defaultValues={savedFormData[STEP_IDS.PERSONAL]}
          />
        </TabsContent>

        <TabsContent value={STEP_IDS.BANK}>
          <BankDetailsTab
            onComplete={completeHandlers[STEP_IDS.BANK]}
            onBack={goToHandlers[STEP_IDS.PERSONAL]}
            defaultValues={savedFormData[STEP_IDS.BANK]}
          />
        </TabsContent>

        <TabsContent value={STEP_IDS.DOCS}>
          <DocumentsTab
            onComplete={completeHandlers[STEP_IDS.DOCS]}
            onBack={goToHandlers[STEP_IDS.BANK]}
            savedUploads={savedFormData[STEP_IDS.DOCS]}
          />
        </TabsContent>

        <TabsContent value={STEP_IDS.REVIEW}>
          <ReviewTab
            completedSteps={completedSteps}
            steps={ONBOARDING_STEPS}
            reviewStepId={STEP_IDS.REVIEW}
            onBack={goToHandlers[STEP_IDS.DOCS]}
          />
        </TabsContent>
      </Tabs>
      </div>
      </motion.div>
    </motion.div>
  );
}
