"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

interface ProjectCreateWizardFooterProps {
  step: number;
  isProvisioning: boolean;
  onCancel: () => void;
  onNextFromBasics: () => void;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}

export function ProjectCreateWizardFooter({
  step,
  isProvisioning,
  onCancel,
  onNextFromBasics,
  onBack,
  onNext,
  onCreate,
}: ProjectCreateWizardFooterProps) {
  return (
    <div className="shrink-0 border-t px-6 py-4 flex gap-2 bg-background">
      {step === 1 && (
        <>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={onNextFromBasics}>
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
            onClick={onBack}
          >
            ← Back
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onNext}
          >
            Skip
          </Button>
          <Button type="button" className="flex-1" onClick={onNext}>
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
            onClick={onBack}
          >
            ← Back
          </Button>
          <Button type="button" className="flex-1" onClick={onNext}>
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
            disabled={isProvisioning}
            onClick={onBack}
          >
            ← Back
          </Button>
          <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
            <LoadingButton
              type="button"
              className="w-full"
              isPending={isProvisioning}
              loadingText="Creating…"
              onClick={onCreate}
            >
              Create Project
            </LoadingButton>
          </motion.div>
        </>
      )}
    </div>
  );
}
