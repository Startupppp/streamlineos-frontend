"use client";

import { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PersonalInfoTab } from "./_components/personal-info-tab";
import { BankDetailsTab } from "./_components/bank-details-tab";
import { DocumentsTab } from "./_components/documents-tab";
import { ReviewTab } from "./_components/review-tab";

const DATA_STEPS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "bank", label: "Bank Details", icon: Landmark },
  { id: "docs", label: "Documents", icon: FileText },
] as const;

const REVIEW_STEP = { id: "finish", label: "Review & Sign", icon: ClipboardCheck } as const;

const steps = [...DATA_STEPS, REVIEW_STEP];

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const markStepComplete = useCallback((step: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const currentStepIndex = steps.findIndex((s) => s.id === activeTab);
  const progressPercentage = useMemo(
    () => DATA_STEPS.length > 0
      ? Math.round((completedSteps.size / DATA_STEPS.length) * 100)
      : 0,
    [completedSteps.size],
  );

  const handlePersonalComplete = useCallback(() => {
    markStepComplete("personal");
    setActiveTab("bank");
  }, [markStepComplete]);

  const handleBankComplete = useCallback(() => {
    markStepComplete("bank");
    setActiveTab("docs");
  }, [markStepComplete]);

  const handleDocsComplete = useCallback(() => {
    markStepComplete("docs");
    setActiveTab("finish");
  }, [markStepComplete]);

  const handleGoToPersonal = useCallback(() => setActiveTab("personal"), []);
  const handleGoToBank = useCallback(() => setActiveTab("bank"), []);
  const handleGoToDocs = useCallback(() => setActiveTab("docs"), []);

  return (
    <motion.div
      className="max-w-4xl mx-auto py-4 md:py-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-2">Complete your profile to get started with Vaivamm Capital.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-8">
        <ProgressBar value={progressPercentage} ariaLabel="Onboarding progress" stepText={`Step ${currentStepIndex + 1} of ${steps.length}`} />
      </motion.div>

      <motion.div variants={fadeUp} className="mb-8">
        <nav aria-label="Onboarding steps">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
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
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${isPast || isCompleted ? "bg-green-500" : "bg-border"}`} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </motion.div>

      <motion.div variants={fadeUp}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsContent value="personal">
          <PersonalInfoTab onComplete={handlePersonalComplete} />
        </TabsContent>

        <TabsContent value="bank">
          <BankDetailsTab
            onComplete={handleBankComplete}
            onBack={handleGoToPersonal}
          />
        </TabsContent>

        <TabsContent value="docs">
          <DocumentsTab
            onComplete={handleDocsComplete}
            onBack={handleGoToBank}
          />
        </TabsContent>

        <TabsContent value="finish">
          <ReviewTab
            completedSteps={completedSteps}
            steps={steps}
            onBack={handleGoToDocs}
          />
        </TabsContent>
      </Tabs>
      </motion.div>
    </motion.div>
  );
}
