"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { clearBackendTokenCache } from "@/lib/api-client";
import { completeOnboardingGate } from "@/lib/onboarding-gate";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSubmitOnboardingMutation } from "@/lib/api/hooks/onboarding";

const ROLE_LABELS: Record<string, string> = {
  CEO: "CEO",
  ADMIN: "Admin",
  HR: "Human Resources",
  ENGINEERING: "Engineering",
  SALES: "Sales",
  DIGITAL_MARKETING: "Digital Marketing",
  FINANCE: "Finance",
  OPERATIONS: "Operations",
  BRANCH_MANAGER: "Branch Manager",
  BRANCH_HR: "Branch HR",
  CUSTOMER_SUPPORT: "Customer Support",
  DESIGN: "Design",
  VIDEO_EDITOR: "Video Editor",
};

interface Step {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface ReviewTabProps {
  completedSteps: Set<string>;
  steps: Step[];
  reviewStepId: string;
  onBack: () => void;
}

export function ReviewTab({
  completedSteps,
  steps,
  reviewStepId,
  onBack,
}: ReviewTabProps) {
  const { data: session, update } = useSession();
  const { mutate: submitOnboarding, isPending: isSubmitting } = useSubmitOnboardingMutation();
  const userRole = session?.user?.role ?? "ENGINEERING";
  const roleLabel = ROLE_LABELS[userRole] ?? userRole;
  const dataSteps = steps.filter((s) => s.id !== reviewStepId);
  const allDataStepsComplete = dataSteps.every((s) => completedSteps.has(s.id));

  function handleSubmit() {
    submitOnboarding(undefined, {
      onSuccess: async () => {
        toast.success("Onboarding submitted! Redirecting…");
        clearBackendTokenCache();
        await completeOnboardingGate("onboarding-done", update);
        window.location.replace("/dashboard");
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  return (
    <div className="text-center py-8 flex flex-col items-center space-y-4">
      <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            variants={fadeUp}
            className="bg-primary/10 p-4 rounded-full"
          >
            <Send className="h-12 w-12 text-primary" aria-hidden="true" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-2xl font-bold">
            Review & Submit
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground max-w-md"
          >
            Please review your completed steps below. When you&apos;re ready,
            click Submit to finalize your onboarding.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="w-full max-w-sm space-y-2 pt-4"
          >
            {dataSteps.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left ${isCompleted ? "bg-emerald-500/10" : "bg-muted/50"}`}
                >
                  {isCompleted ? (
                    <Check
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <StepIcon
                      className="h-5 w-5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`text-sm font-medium ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`ml-auto text-xs ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                  >
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
              );
            })}

            <div className="flex items-center gap-3 p-3 rounded-lg text-left bg-primary/10">
              <Shield
                className="h-5 w-5 text-primary shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-primary">
                Role: {roleLabel}
              </span>
              <span className="ml-auto text-xs text-primary">Assigned</span>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-sm text-muted-foreground italic pt-2"
          >
            Default leave balances will be allocated upon submission
          </motion.p>

          <motion.div variants={fadeUp} className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span
              title={
                !allDataStepsComplete
                  ? "Complete all steps before submitting"
                  : undefined
              }
            >
              <LoadingButton
                onClick={handleSubmit}
                disabled={!allDataStepsComplete}
                isPending={isSubmitting}
                loadingText="Submitting…"
                aria-describedby={
                  !allDataStepsComplete ? "review-hint" : undefined
                }
              >
                Submit
                <ArrowRight className="ml-2 h-4 w-4" />
              </LoadingButton>
            </span>
            {!allDataStepsComplete && (
              <p id="review-hint" className="sr-only">
                Complete all previous steps to enable this button
              </p>
            )}
          </motion.div>
      </motion.div>
    </div>
  );
}
