"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { CheckCircle, ArrowLeft, ArrowRight, Check, type LucideIcon } from "lucide-react";

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

export function ReviewTab({ completedSteps, steps, reviewStepId, onBack }: ReviewTabProps) {
  const router = useRouter();

  // Show all steps except the review step itself
  const dataSteps = steps.filter((s) => s.id !== reviewStepId);
  const allDataStepsComplete = dataSteps.every((s) => completedSteps.has(s.id));

  return (
    <Card className="shadow-noir border-border text-center py-10">
      <CardContent className="flex flex-col items-center space-y-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center space-y-4"
        >
          <motion.div variants={fadeUp} className="bg-green-500/15 p-4 rounded-full">
            <CheckCircle className="h-16 w-16 text-green-500" aria-hidden="true" />
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-2xl font-bold">You&apos;re All Set!</motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-md">
            Your onboarding information has been submitted. The HR team will verify your documents and approve your profile soon.
          </motion.p>

          <motion.div variants={fadeUp} className="w-full max-w-sm space-y-2 pt-4">
            {dataSteps.map((step) => {
              const isCompleted = completedSteps.has(step.id);
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg text-left ${isCompleted ? "bg-green-500/10" : "bg-muted/50"}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <StepIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className={`text-sm font-medium ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  <span className={`ml-auto text-xs ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp} className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <span title={!allDataStepsComplete ? "Complete all steps before proceeding" : undefined}>
              <Button onClick={() => router.push("/dashboard")} disabled={!allDataStepsComplete} aria-describedby={!allDataStepsComplete ? "review-hint" : undefined}>
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </span>
            {!allDataStepsComplete && (
              <p id="review-hint" className="sr-only">Complete all previous steps to enable this button</p>
            )}
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
