"use client";

import { memo, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DATA_STEP_IDS,
  ONBOARDING_SEQUENCE,
  STEP_TITLES,
  type StepId,
} from "../lib/constants";

const EASE = [0.22, 1, 0.36, 1] as const;

const FACET_COPY: Record<StepId, string> = {
  personal: "Identity",
  bank: "Payroll",
  docs: "Documents",
  finish: "Ready",
};

const ORBIT_CHIPS: ReadonlyArray<{
  id: string;
  label: string;
  className: string;
  delay: number;
  amplitude: number;
  duration: number;
}> = [
  {
    id: "secure",
    label: "Encrypted at rest",
    className: "left-[0%] top-[12%] -rotate-[6deg]",
    delay: 0.45,
    amplitude: 3,
    duration: 7,
  },
  {
    id: "hr",
    label: "HR verifies next",
    className: "right-[0%] top-[10%] rotate-[5deg]",
    delay: 0.62,
    amplitude: 2.6,
    duration: 6.5,
  },
  {
    id: "dayone",
    label: "Day-one ready",
    className: "right-[4%] bottom-[8%] -rotate-[3deg]",
    delay: 0.8,
    amplitude: 3.2,
    duration: 7.8,
  },
];

type ProfileJourneyStageProps = {
  stepId: StepId;
  completedSteps: ReadonlySet<string>;
  firstName?: string;
  roleLabel?: string;
  className?: string;
};

function ProfileJourneyStageInner({
  stepId,
  completedSteps,
  firstName = "",
  roleLabel,
  className,
}: ProfileJourneyStageProps) {
  const reduceMotion = useReducedMotion();
  const currentIndex = Math.max(0, ONBOARDING_SEQUENCE.indexOf(stepId));
  const dataDone = DATA_STEP_IDS.filter((id) => completedSteps.has(id)).length;
  const progressPct = Math.round(
    ((currentIndex + (completedSteps.has(stepId) ? 0.35 : 0)) /
      ONBOARDING_SEQUENCE.length) *
      100,
  );
  const monogram = (firstName.trim().charAt(0) || "?").toUpperCase();

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 items-center justify-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-[10%] rounded-[2.5rem] bg-gradient-to-br from-brand-bright/22 via-brand-cyan/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[16%] top-[20%] h-36 w-36 rounded-full bg-brand-core/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[16%] right-[12%] h-44 w-44 rounded-full bg-brand-cyan/12 blur-3xl"
        aria-hidden
      />

      <div className="relative h-full min-h-[280px] w-full max-w-[480px] xl:max-w-[540px] 2xl:max-w-[600px]">
        {ORBIT_CHIPS.map((chip) => (
          <motion.div
            key={chip.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0.12 : 0.5,
              delay: reduceMotion ? 0 : chip.delay,
              ease: EASE,
            }}
            className={cn("absolute z-30", chip.className)}
            aria-hidden
          >
            <FloatLayer
              reduce={Boolean(reduceMotion)}
              amplitude={chip.amplitude}
              duration={chip.duration}
            >
              <div className="rounded-full border border-border/80 bg-card/90 px-2.5 py-1 shadow-[0_16px_36px_-20px_rgba(30,64,175,0.35)] backdrop-blur-sm">
                <p className="text-[11px] font-medium text-foreground/90">
                  {chip.label}
                </p>
              </div>
            </FloatLayer>
          </motion.div>
        ))}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.45, ease: EASE }}
          className="absolute inset-[8%] z-20 flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/85 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Profile dossier
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {firstName ? `${firstName}'s day one` : "Your day one"}
              </p>
            </div>
            <div
              className="relative flex h-11 w-11 shrink-0 items-center justify-center"
              aria-hidden
            >
              <svg className="absolute inset-0 h-11 w-11 -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  className="stroke-brand-core"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 18}
                  initial={false}
                  animate={{
                    strokeDashoffset:
                      2 * Math.PI * 18 * (1 - Math.min(progressPct, 100) / 100),
                  }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.4, ease: EASE }}
                />
              </svg>
              <span className="font-display text-sm font-bold text-foreground">
                {dataDone}/{DATA_STEP_IDS.length}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 py-4">
            <div className="flex items-center gap-3">
              <motion.div
                key={monogram}
                initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-core/25 bg-brand-core/10 font-display text-lg font-extrabold text-brand-deep"
              >
                {monogram}
              </motion.div>
              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={stepId}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="truncate text-sm font-semibold text-foreground"
                  >
                    {STEP_TITLES[stepId]}
                  </motion.p>
                </AnimatePresence>
                <p className="text-[12px] text-muted-foreground">
                  {roleLabel
                    ? `Joining as ${roleLabel}`
                    : "Building your employee profile"}
                </p>
              </div>
            </div>

            <ol className="relative min-h-0 flex-1 space-y-0" aria-label="Onboarding journey">
              <div
                className="absolute bottom-3 left-[11px] top-3 w-px bg-border"
                aria-hidden
              />
              <motion.div
                className="absolute left-[11px] top-3 w-px origin-top bg-foreground"
                aria-hidden
                initial={false}
                animate={{
                  scaleY:
                    ONBOARDING_SEQUENCE.length <= 1
                      ? 0
                      : currentIndex / (ONBOARDING_SEQUENCE.length - 1),
                }}
                style={{ height: "calc(100% - 1.5rem)" }}
                transition={{ duration: reduceMotion ? 0.01 : 0.35, ease: EASE }}
              />

              {ONBOARDING_SEQUENCE.map((id, index) => {
                const done = completedSteps.has(id) && id !== stepId;
                const active = id === stepId;
                const upcoming = !done && !active;

                return (
                  <li
                    key={id}
                    className="relative flex items-center gap-3 py-2 pl-0"
                  >
                    <span
                      className={cn(
                        "relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                        done
                          ? "border-foreground bg-foreground text-background"
                          : active
                            ? "border-brand-core bg-brand-core/15 text-brand-core ring-4 ring-brand-core/10"
                            : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3" aria-hidden />
                      ) : (
                        index + 1
                      )}
                      {active && !reduceMotion ? (
                        <motion.span
                          className="absolute inset-[-3px] rounded-full border border-brand-core/35"
                          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                          transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[13px] font-semibold tracking-tight",
                          upcoming
                            ? "text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {FACET_COPY[id]}
                      </p>
                      <p
                        className={cn(
                          "text-[11px]",
                          active
                            ? "text-brand-deep"
                            : done
                              ? "text-muted-foreground"
                              : "text-muted-foreground/80",
                        )}
                      >
                        {done
                          ? "Locked in"
                          : active
                            ? "In progress"
                            : "Waiting"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FloatLayer({
  children,
  reduce,
  amplitude,
  duration,
}: {
  children: ReactNode;
  reduce: boolean;
  amplitude: number;
  duration: number;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export const ProfileJourneyStage = memo(ProfileJourneyStageInner);
