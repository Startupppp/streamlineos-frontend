"use client";

import { useRef } from "react";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useProjectCreate,
  TOTAL_STEPS,
  STEP_LABELS,
} from "./use-project-create";
import type { StepSharedProps } from "./use-project-create";
import {
  useProjectProvisioning,
  type ProjectCreateScope,
} from "./use-project-provisioning";
import { LoadingButton } from "@/components/ui/loading-button";
import { StepBasics } from "./steps/step-basics";
import type { BasicsHandle } from "./steps/step-basics";
import { StepType } from "./steps/step-type";
import { StepTemplate } from "./steps/step-template";
import { StepToggles } from "./steps/step-toggles";
import { StepWorkflow } from "./steps/step-workflow";
import { StepTeam } from "./steps/step-team";
import { StepReview } from "./steps/step-review";

interface ProjectCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope?: ProjectCreateScope;
}

export function ProjectCreateWizard({
  open,
  onOpenChange,
  scope,
}: ProjectCreateWizardProps) {
  const { step, direction, draft, updateDraft, goNext, goBack, reset } =
    useProjectCreate();

  useRegisterBuildDirtyState(open && (step > 1 || draft.name.trim() !== ""));

  const basicsRef = useRef<BasicsHandle>(null);
  const shouldReduceMotion = useReducedMotion();

  const sharedProps: StepSharedProps = { draft, updateDraft };

  const stepVariants = {
    initial: (d: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : d * 24,
    }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: shouldReduceMotion ? 0 : d * -24 }),
  };

  function handleOpenChange(value: boolean) {
    if (!value) reset();
    onOpenChange(value);
  }

  function handleClose() {
    handleOpenChange(false);
  }

  function handleSuccess() {
    handleOpenChange(false);
  }

  const { provision, isProvisioning } = useProjectProvisioning(
    handleSuccess,
    scope,
  );

  function handleNextFromBasics(): void {
    void basicsRef.current?.validate()?.then((ok) => {
      if (ok) goNext();
    });
  }

  function handleCreate(): void {
    void provision(draft);
  }

  const currentLabel = STEP_LABELS[step - 1] ?? "";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col overflow-hidden"
      >
        <SheetHeader className="shrink-0 px-6 pt-5 pb-4 border-b text-left">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors duration-300",
                  i + 1 <= step ? "bg-primary" : "bg-border/60",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">
            Step {step} of {TOTAL_STEPS}
          </p>
          <SheetTitle className="text-lg font-semibold">
            {currentLabel}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Project creation wizard — step {step} of {TOTAL_STEPS}
          </SheetDescription>
        </SheetHeader>

        <SheetBody
          className={cn(
            "px-6",
            step === 4 && "flex flex-col overflow-hidden",
          )}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(step === 4 && "flex min-h-0 flex-1 flex-col")}
            >
              {step === 1 && <StepBasics ref={basicsRef} {...sharedProps} />}
              {step === 2 && <StepType {...sharedProps} />}
              {step === 3 && <StepTemplate {...sharedProps} />}
              {step === 4 && <StepToggles {...sharedProps} />}
              {step === 5 && <StepWorkflow {...sharedProps} />}
              {step === 6 && <StepTeam {...sharedProps} />}
              {step === 7 && <StepReview draft={draft} />}
            </motion.div>
          </AnimatePresence>
        </SheetBody>

        <div className="shrink-0 border-t px-6 py-4 flex gap-2 bg-background">
          {step === 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleNextFromBasics}
              >
                Next →
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={goBack}
              >
                ← Back
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                onClick={goNext}
              >
                Skip
              </Button>
              <Button type="button" className="flex-1" onClick={goNext}>
                Next →
              </Button>
            </>
          )}
          {step > 2 && step < 7 && (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={goBack}
              >
                ← Back
              </Button>
              <Button type="button" className="flex-1" onClick={goNext}>
                Next →
              </Button>
            </>
          )}
          {step === 7 && (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={goBack}
              >
                ← Back
              </Button>
              <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                <LoadingButton
                  type="button"
                  className="w-full"
                  isPending={isProvisioning}
                  loadingText="Creating…"
                  onClick={handleCreate}
                >
                  Create Project
                </LoadingButton>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
