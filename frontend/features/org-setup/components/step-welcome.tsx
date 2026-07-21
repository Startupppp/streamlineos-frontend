"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { BRAND_NAME } from "@/lib/branding";

type StepWelcomeProps = {
  onNext: () => void;
  onSkip: () => void;
  isSkipping?: boolean;
  firstName?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function StepWelcome({
  onNext,
  onSkip,
  isSkipping = false,
  firstName = "",
}: StepWelcomeProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center overflow-y-auto overscroll-contain scrollbar-hide py-2 sm:py-4 md:py-8 xl:py-10">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: EASE }}
        className="min-w-0 space-y-5 sm:space-y-6"
      >
        <div className="min-w-0 space-y-3">
          <p className="text-[12px] font-medium text-brand-deep">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </p>
          <h1 className="font-display text-[1.75rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance sm:text-[2.1rem] md:text-[2.35rem]">
            Birth your workspace on{" "}
            <span className="brand-sweep">{BRAND_NAME}</span>
          </h1>
          <p className="w-full text-sm leading-relaxed text-muted-foreground sm:max-w-md sm:text-[15px]">
            A few questions shape your modules, defaults, and team invites —
            then you land ready to run.
          </p>
        </div>

        <div className="w-full min-w-0 space-y-2 pt-1">
          <Button
            className="h-11 min-h-11 w-full gap-1.5 text-sm sm:h-10 sm:min-h-10"
            onClick={onNext}
            disabled={isSkipping}
          >
            Start setup
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <LoadingButton
            variant="ghost"
            className="h-11 min-h-11 w-full text-sm text-muted-foreground hover:text-foreground sm:h-10 sm:min-h-10"
            onClick={onSkip}
            isPending={isSkipping}
            loadingText="Setting up defaults…"
          >
            I&apos;ll set up later
          </LoadingButton>
        </div>
      </motion.div>
    </div>
  );
}
