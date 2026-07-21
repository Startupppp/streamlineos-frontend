"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_COL_PAD,
  STEP_SUBTITLES,
  type StepId,
} from "../lib/constants";
import { ProfileJourneyStage } from "./profile-journey-stage";

const EASE = [0.22, 1, 0.36, 1] as const;

type BrandColumnProps = {
  stepId: StepId;
  completedSteps: ReadonlySet<string>;
  firstName?: string;
  roleLabel?: string;
};

function BrandColumnInner({
  stepId,
  completedSteps,
  firstName = "",
  roleLabel,
}: BrandColumnProps) {
  const reduceMotion = useReducedMotion();
  const displayName = firstName.trim();

  return (
    <aside className="relative hidden h-full min-h-0 w-1/2 min-w-0 shrink-0 flex-col overflow-hidden border-l border-border/60 md:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at 50% 38%, black 0%, transparent 76%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 38%, black 0%, transparent 76%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-6 h-64 w-64 rounded-full bg-brand-bright/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-4 right-[-2rem] h-72 w-72 rounded-full bg-brand-cyan/16 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[36%] h-56 w-56 -translate-x-1/2 rounded-full bg-brand-core/10 blur-3xl"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 min-w-0 flex-col",
          ONBOARDING_COL_PAD,
        )}
      >
        <div
          className="mb-3 flex items-center gap-2.5 self-start lg:mb-4"
          aria-label={BRAND_NAME}
        >
          <AnimatedLogo size={28} className="rounded-xl" />
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
            {BRAND_NAME}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mb-4 min-w-0 max-w-xl shrink-0 space-y-2 lg:mb-5"
        >
          <p className="text-xs font-medium text-brand-deep">
            Day one on {BRAND_NAME}
          </p>
          <h2 className="font-display text-[1.65rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground text-balance lg:text-[1.9rem] xl:text-[2.15rem] 2xl:text-[2.35rem]">
            {displayName ? (
              <>
                Welcome aboard,
                <span className="mt-1 block">
                  <span className="brand-sweep">{displayName}</span>
                </span>
              </>
            ) : (
              <>
                Your profile.
                <span className="mt-1 block">
                  Ready for{" "}
                  <span className="brand-sweep">{BRAND_NAME}</span>
                </span>
              </>
            )}
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stepId}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="max-w-md text-[13px] leading-relaxed text-muted-foreground lg:text-sm"
            >
              {STEP_SUBTITLES[stepId]}
            </motion.p>
          </AnimatePresence>
          {roleLabel ? (
            <p className="text-[12px] text-muted-foreground">
              Joining as{" "}
              <span className="font-medium text-foreground/80">{roleLabel}</span>
            </p>
          ) : null}
        </motion.div>

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch pb-1">
          <ProfileJourneyStage
            stepId={stepId}
            completedSteps={completedSteps}
            firstName={displayName}
            roleLabel={roleLabel}
            className="h-full w-full max-w-none"
          />
        </div>
      </div>
    </aside>
  );
}

export const BrandColumn = memo(BrandColumnInner);
