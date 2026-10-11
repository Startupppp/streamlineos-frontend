"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StepBasics } from "./steps/step-basics";
import type { BasicsHandle } from "./steps/step-basics";
import { StepType } from "./steps/step-type";
import { StepTemplate } from "./steps/step-template";
import { StepToggles } from "./steps/step-toggles";
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
  const { step, direction, draft, updateDraft, goNext, goBack, goToStep1, reset } =
    useProjectCreate();

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
    reset();
    onOpenChange(false);
  }

  function handleKeyConflict(message: string): void {
    pendingKeyErrorRef.current = message;
    goToStep1();
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

  function handleCreate(): void {
    void provision(draft);
  }

  const currentLabel = STEP_LABELS[step - 1] ?? "";

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
            Step {step} of {TOTAL_STEPS}
          </p>
          <SheetTitle className="text-lg font-medium">
            {currentLabel}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Project creation wizard — step {step} of {TOTAL_STEPS}
          </SheetDescription>
          <div className="mt-3 flex gap-1" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
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

        <SheetBody
          className={cn(
            "px-6",
            step === 4 && "flex flex-col overflow-hidden",
          )}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
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
              {step === 1 && (
                <StepBasics ref={basicsRef} {...sharedProps} onCancel={requestClose} />
              )}
              {step === 2 && <StepType {...sharedProps} />}
              {step === 3 && <StepTemplate {...sharedProps} />}
              {step === 4 && <StepToggles {...sharedProps} />}
              {step === 5 && <StepWorkflow {...sharedProps} />}
              {step === 6 && <StepTeam {...sharedProps} />}
              {step === 7 && <StepReview draft={draft} />}
            </motion.div>
          </AnimatePresence>
        </SheetBody>

        <ProjectCreateWizardFooter
          step={step}
          isProvisioning={isProvisioning}
          onCancel={requestClose}
          onNextFromBasics={handleNextFromBasics}
          onBack={goBack}
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
