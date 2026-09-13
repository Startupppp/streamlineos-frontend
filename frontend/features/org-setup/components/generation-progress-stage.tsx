"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, RefreshCw } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { PREVIEW_EASE } from "../lib/preview-motion";
import type { ProvisioningIssue } from "../hooks/use-setup-provisioning";
import type { RecipientOutcome } from "@/lib/api/hooks/org-schema";
import type { SetupError } from "./generation-failure-stage";
import { GenerationFailureStage } from "./generation-failure-stage";

const RING_SIZE = 112;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type GenerationProgressStageProps = {
  steps: readonly string[];
  completedSteps: number;
  progress: number;
  companyName?: string;
  setupError: SetupError | null;
  provisioningIssue: ProvisioningIssue | null;
  recipientOutcomes: RecipientOutcome[] | null;
  isRecheckingProvisioning: boolean;
  showWelcome: boolean;
  onRetry: () => void;
  onRecheckProvisioning: () => void;
  onContinueAnyway: () => void;
  onOpenOrganization?: () => void;
  onGoToInvitations?: () => void;
  isNavigating: boolean;
};

export function GenerationProgressStage({
  steps,
  completedSteps,
  progress,
  companyName,
  setupError,
  provisioningIssue,
  recipientOutcomes,
  isRecheckingProvisioning,
  showWelcome,
  onRetry,
  onRecheckProvisioning,
  onContinueAnyway,
  onOpenOrganization,
  onGoToInvitations,
  isNavigating,
}: GenerationProgressStageProps) {
  const reduceMotion = useReducedMotion();
  const total = steps.length;
  const workspaceLabel = companyName?.trim() || BRAND_NAME;
  const isComplete = showWelcome || completedSteps >= total;
  const activeIndex = isComplete ? -1 : completedSteps;
  const activeLabel = isComplete
    ? "All systems online"
    : (steps[activeIndex] ?? "Finishing up…");
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

  if (setupError) {
    return (
      <GenerationFailureStage
        workspaceLabel={workspaceLabel}
        setupError={setupError}
        onRetry={onRetry}
        onOpenOrganization={onOpenOrganization}
        onGoToInvitations={onGoToInvitations}
        isNavigating={isNavigating}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-hide">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-core/[0.07] via-brand-cyan/[0.03] to-transparent" />
        <div className="absolute left-0 top-16 h-28 w-28 rounded-full bg-brand-core/10 blur-3xl" />
        <div className="absolute right-0 top-28 h-32 w-32 rounded-full bg-brand-cyan/12 blur-3xl" />
      </div>

      <div className="relative flex w-full min-w-0 max-w-full flex-col gap-5 pb-1">
        <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-4 pt-1 text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0.12 : 0.5,
              delay: reduceMotion ? 0 : 0.04,
              ease: PREVIEW_EASE,
            }}
            className="relative"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Organization setup progress"
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={RING_STROKE}
                className="text-border/70"
              />
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="url(#generation-ring-grad)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={false}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  ease: PREVIEW_EASE,
                }}
              />
              <defs>
                <linearGradient
                  id="generation-ring-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="var(--brand-core)" />
                  <stop offset="100%" stopColor="var(--brand-cyan)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
                {progress}
                <span className="text-base font-bold text-muted-foreground">%</span>
              </span>
              <span className="mt-0.5 text-micro font-medium uppercase tracking-[0.14em] text-muted-foreground">
                launch
              </span>
            </div>
          </motion.div>

          <div className="w-full min-w-0 max-w-full space-y-1.5 px-1 md:max-w-sm">
            <h2 className="min-w-0 w-full font-display text-[1.35rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
              <span className="block text-balance break-words">Assembling {workspaceLabel}</span>
            </h2>
            <p
              className="min-w-0 truncate text-label text-muted-foreground"
              aria-live="polite"
            >
              {activeLabel}
            </p>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-full space-y-2">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-border/70"
            aria-hidden
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-core to-brand-cyan"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                ease: PREVIEW_EASE,
              }}
            />
          </div>
          <div className="flex items-center justify-between px-0.5">
            <p className="text-dense font-medium text-muted-foreground">
              {isComplete
                ? `${BRAND_NAME} ready`
                : `${Math.min(completedSteps + 1, total)} of ${total}`}
            </p>
            <p className="text-dense tabular-nums text-muted-foreground">
              {progress}%
            </p>
          </div>
        </div>

        <ul className="w-full min-w-0 max-w-full space-y-1" aria-label="Setup progress">
          {steps.map((label, index) => {
            const done = index < completedSteps || isComplete;
            const active = index === activeIndex;
            const pending = !done && !active;

            return (
              <motion.li
                key={label}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : index * 0.045,
                  duration: reduceMotion ? 0.12 : 0.28,
                  ease: PREVIEW_EASE,
                }}
                className={cn(
                  "relative flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-colors duration-300",
                  active &&
                    "bg-gradient-to-r from-brand-core/[0.12] via-brand-cyan/[0.06] to-transparent",
                  done && !active && "opacity-90",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "generation-active-glow"}
                    className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-brand-core/20"
                    transition={{ duration: 0.28, ease: PREVIEW_EASE }}
                  />
                ) : null}

                <StepMarker done={done} active={active} reduceMotion={reduceMotion} />

                <span
                  className={cn(
                    "relative min-w-0 flex-1 truncate text-label tracking-tight transition-colors duration-300",
                    done && "font-medium text-foreground",
                    active && "font-semibold text-brand-deep dark:text-brand-bright",
                    pending && "text-muted-foreground",
                  )}
                >
                  {label}
                </span>

                {active && !reduceMotion ? (
                  <span className="relative ml-auto flex items-center gap-1" aria-hidden>
                    {[0, 1, 2].map((dot) => (
                      <motion.span
                        key={dot}
                        className="h-1 w-1 rounded-full bg-brand-core"
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: dot * 0.16,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </span>
                ) : null}
              </motion.li>
            );
          })}
        </ul>

        {provisioningIssue !== null && !showWelcome && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: PREVIEW_EASE }}
            className="mt-2 rounded-xl border border-status-warning-rule bg-status-warning-surface px-3.5 py-3"
          >
            <p className="text-xs font-semibold text-status-warning-ink">
              {provisioningIssue.title}
            </p>
            <p className="mt-0.5 break-words text-xs text-status-warning-ink">
              {provisioningIssue.message}
            </p>
            {provisioningIssue.reference !== null && (
              <p className="mt-1.5 flex flex-wrap items-baseline gap-1 text-[11px] text-status-warning-ink/70">
                <span className="shrink-0 font-medium">Support ref:</span>
                <code className="select-all break-all font-mono">{provisioningIssue.reference}</code>
              </p>
            )}
            {recipientOutcomes !== null && recipientOutcomes.length > 0 && (
              <RecipientOutcomeList outcomes={recipientOutcomes} />
            )}
            <div className="mt-2.5 flex gap-2">
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={onRecheckProvisioning}
                isPending={isRecheckingProvisioning}
                className="h-7 gap-1.5 border-status-warning-rule bg-status-warning-surface text-status-warning-ink hover:bg-status-warning-surface"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                Check again
              </LoadingButton>
              <Button
                size="sm"
                variant="ghost"
                onClick={onContinueAnyway}
                disabled={isRecheckingProvisioning}
                className="h-7 text-status-warning-ink hover:bg-status-warning-surface"
              >
                Continue to dashboard
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}

const OUTCOME_LABEL: Record<string, string> = {
  successful: "joined",
  queued: "pending",
  skipped: "you",
};

const OUTCOME_REASON_LABEL: Record<string, string> = {
  already_member: "already a member",
  invitation_revoked: "declined or revoked",
  unknown: "not sent",
};

function recipientOutcomeLabel(outcome: RecipientOutcome): string {
  if (outcome.outcome === "failed") {
    return OUTCOME_REASON_LABEL[outcome.reason ?? ""] ?? "not sent";
  }
  return OUTCOME_LABEL[outcome.outcome] ?? outcome.outcome;
}

function recipientOutcomeClass(outcome: RecipientOutcome["outcome"]): string {
  if (outcome === "successful")
    return "text-status-success-ink bg-status-success-surface";
  if (outcome === "failed") return "text-status-danger-ink bg-status-danger-surface";
  return "text-status-warning-ink/60 bg-status-warning-surface/60";
}

function RecipientOutcomeList({ outcomes }: { outcomes: RecipientOutcome[] }) {
  const visibleOutcomes = outcomes.filter((o) => o.outcome !== "skipped");
  if (visibleOutcomes.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="Invitation outcomes">
      {visibleOutcomes.map((outcome) => (
        <li key={outcome.email} className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-status-warning-ink/80">
            {outcome.email}
          </span>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
              recipientOutcomeClass(outcome.outcome),
            )}
          >
            {recipientOutcomeLabel(outcome)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StepMarker({
  done,
  active,
  reduceMotion,
}: {
  done: boolean;
  active: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <span
      className={cn(
        "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
        done
          ? "bg-gradient-to-br from-brand-core to-brand-cyan shadow-[0_8px_18px_-10px_rgba(30,64,175,0.55)]"
          : active
            ? "bg-brand-core/15 ring-1 ring-brand-core/25"
            : "bg-muted",
      )}
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.span
            key="check"
            initial={
              reduceMotion ? { opacity: 0 } : { scale: 0.55, opacity: 0 }
            }
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 480, damping: 22 }
            }
          >
            <Check className="h-3 w-3 text-white stroke-[2.75]" />
          </motion.span>
        ) : active ? (
          <motion.span
            key="pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex h-2 w-2"
          >
            {!reduceMotion ? (
              <motion.span
                className="absolute inset-0 rounded-full bg-brand-core"
                animate={{ opacity: [0.35, 0, 0.35], scale: [1, 2.1, 1] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ) : null}
            <span className="relative h-2 w-2 rounded-full bg-brand-core" />
          </motion.span>
        ) : (
          <motion.span
            key="dot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35"
          />
        )}
      </AnimatePresence>
    </span>
  );
}
