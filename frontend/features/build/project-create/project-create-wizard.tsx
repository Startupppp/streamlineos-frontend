"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useProjectCreate } from "./use-project-create";
import type { StepSharedProps } from "./use-project-create";
import {
  useProjectProvisioning,
  type ProjectCreateScope,
} from "./use-project-provisioning";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StepBasics } from "./steps/step-basics";
import type { BasicsHandle } from "./steps/step-basics";
import { StepType } from "./steps/step-type";
import { StepTemplate } from "./steps/step-template";
import { StepWorkflow } from "./steps/step-workflow";
import { StepTeam } from "./steps/step-team";
import { StepReview } from "./steps/step-review";
import { ProjectCreateWizardFooter } from "./project-create-wizard-footer";

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
  const {
    step,
    stepId,
    totalSteps,
    currentLabel,
    direction,
    draft,
    updateDraft,
    goNext,
    goBack,
    goToStep,
    reset,
  } = useProjectCreate();
  const [keyConflictMessage, setKeyConflictMessage] = useState<string | null>(null);

  const isDirty = open && (step > 1 || draft.name.trim() !== "");
  useRegisterDirtyState(isDirty);
  const isDirtyRef = useRef(false);
  useLayoutEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const basicsRef = useRef<BasicsHandle>(null);
  const pendingKeyErrorRef = useRef<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (step !== 1 || !pendingKeyErrorRef.current) return;
    const msg = pendingKeyErrorRef.current;
    pendingKeyErrorRef.current = null;
    basicsRef.current?.setKeyError(msg);
  }, [step]);

  const sharedProps: StepSharedProps = { draft, updateDraft };

  const stepVariants = {
    initial: (d: number) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : d * 24,
    }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: shouldReduceMotion ? 0 : d * -24 }),
  };

  function handleSuccess() {
    setKeyConflictMessage(null);
    pendingKeyErrorRef.current = null;
    reset();
    onOpenChange(false);
  }

  function handleKeyConflict(message: string): void {
    pendingKeyErrorRef.current = message;
    setKeyConflictMessage(message);
    toast.error(message);
  }

  function handleGoToBasicsFromConflict(): void {
    setKeyConflictMessage(null);
    goToStep(1);
  }

  const { provision, isProvisioning } = useProjectProvisioning(
    handleSuccess,
    scope,
    { onKeyConflict: handleKeyConflict },
  );
  const isBusyRef = useRef(false);
  useLayoutEffect(() => {
    isBusyRef.current = isProvisioning;
  }, [isProvisioning]);

  const requestClose = useCallback(() => {
    if (isBusyRef.current) return;
    if (isDirtyRef.current) {
      setDiscardConfirmOpen(true);
      return;
    }
    setKeyConflictMessage(null);
    pendingKeyErrorRef.current = null;
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  function handleOpenChange(value: boolean) {
    if (!value) {
      requestClose();
      return;
    }
    onOpenChange(true);
  }

  function handleDiscardConfirm() {
    setKeyConflictMessage(null);
    pendingKeyErrorRef.current = null;
    setDiscardConfirmOpen(false);
    reset();
    onOpenChange(false);
  }

  function handleOpenAutoFocus(event: Event) {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>(
      '[data-project-create-name="true"]',
    );
    input?.focus({ preventScroll: true });
  }

  function handleDismissRequest(event: { preventDefault(): void }) {
    event.preventDefault();
    requestClose();
  }

  function handleNextFromBasics(): void {
    void basicsRef.current?.validate()?.then((ok) => {
      if (ok) goNext();
    });
  }

  function handleBack(): void {
    if (stepId === "review") {
      setKeyConflictMessage(null);
    }
    goBack();
  }

  function handleCreate(): void {
    setKeyConflictMessage(null);
    pendingKeyErrorRef.current = null;
    void provision(draft);
  }

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col overflow-hidden"
        onOpenAutoFocus={handleOpenAutoFocus}
        onEscapeKeyDown={handleDismissRequest}
        onPointerDownOutside={handleDismissRequest}
        onInteractOutside={handleDismissRequest}
      >
        <SheetHeader className="shrink-0 border-b py-4 pl-6 pr-14 text-left">
          <p className="text-xs text-muted-foreground mb-0.5">
            Step {step} of {totalSteps}
          </p>
          <SheetTitle className="text-lg font-medium">
            {currentLabel}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Project creation wizard — step {step} of {totalSteps}
          </SheetDescription>
          <div className="mt-3 flex gap-1" aria-label={`Step ${step} of ${totalSteps}`}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  i + 1 <= step ? "bg-primary" : "bg-border/60",
                )}
              />
            ))}
          </div>
        </SheetHeader>

        <SheetBody className="px-6">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={stepId}
              custom={direction}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {stepId === "basics" && (
                <StepBasics ref={basicsRef} {...sharedProps} onCancel={requestClose} />
              )}
              {stepId === "type" && <StepType {...sharedProps} />}
              {stepId === "template" && <StepTemplate {...sharedProps} />}
              {stepId === "workflow" && <StepWorkflow {...sharedProps} />}
              {stepId === "people" && <StepTeam {...sharedProps} />}
              {stepId === "review" && <StepReview draft={draft} keyConflictMessage={keyConflictMessage} onGoToBasics={handleGoToBasicsFromConflict} />}
            </motion.div>
          </AnimatePresence>
        </SheetBody>

        <ProjectCreateWizardFooter
          stepId={stepId}
          isProvisioning={isProvisioning}
          onCancel={requestClose}
          onNextFromBasics={handleNextFromBasics}
          onBack={handleBack}
          onNext={goNext}
          onCreate={handleCreate}
        />
      </SheetContent>
    </Sheet>
      <ConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title="Discard draft?"
        description="You have unsaved changes in this project wizard. Closing will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={handleDiscardConfirm}
      />
    </>
  );
}
