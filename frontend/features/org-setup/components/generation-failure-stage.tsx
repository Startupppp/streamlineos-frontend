"use client";

import type { MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { ServerErrorIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { BRAND_SUPPORT_EMAIL } from "@/lib/branding";
import { PREVIEW_EASE } from "../lib/preview-motion";

export type SetupError =
  | { kind: "setup-failed"; message: string }
  | { kind: "module-not-in-plan"; message: string }
  | { kind: "invites-failed"; message: string }
  | { kind: "optional-stage-blocked"; message: string; blockedAtStage?: string }
  | { kind: "required-stage-failed"; message: string; blockedAtStage?: string };

const SUPPORT_MAILTO = `mailto:${BRAND_SUPPORT_EMAIL}`;

function handleSupportEmailClick(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  window.location.assign(SUPPORT_MAILTO);
}

type GenerationFailureStageProps = {
  workspaceLabel: string;
  setupError: SetupError;
  onRetry: () => void;
  onBackToProducts?: () => void;
  onOpenOrganization?: () => void;
  onGoToInvitations?: () => void;
  onContinueAnyway?: () => void;
  isNavigating?: boolean;
};

export function GenerationFailureStage({
  workspaceLabel,
  setupError,
  onRetry,
  onBackToProducts,
  onOpenOrganization,
  onGoToInvitations,
  onContinueAnyway,
  isNavigating = false,
}: GenerationFailureStageProps) {
  const reduceMotion = useReducedMotion();

  if (setupError.kind === "optional-stage-blocked") {
    return (
      <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-hide">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-500/[0.06] to-transparent"
          aria-hidden
        />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: PREVIEW_EASE }}
          className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-4 py-6 text-center"
        >
          <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            <ServerErrorIllustration />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-status-warning-rule bg-status-warning-surface px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning-fill" aria-hidden />
            <span className="text-dense font-semibold tracking-tight text-status-warning-ink">
              Setup completed with warnings
            </span>
          </div>
          <div className="w-full min-w-0 max-w-full space-y-1.5 md:max-w-sm">
            <h2 className="min-w-0 w-full font-display text-[1.35rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
              <span className="block text-balance break-words">{workspaceLabel} is ready</span>
            </h2>
            <p className="text-label text-muted-foreground">
              An optional step could not be completed. Your workspace is ready — continue or review the issue.
            </p>
          </div>
          <div
            role="alert"
            className="w-full min-w-0 max-w-full rounded-xl border border-status-warning-rule bg-status-warning-surface/50 px-3 py-2.5 text-center md:max-w-sm"
          >
            <p className="text-dense font-semibold uppercase tracking-[0.12em] text-status-warning-ink/80">
              Optional step blocked
            </p>
            <p className="mt-1 break-words text-label text-foreground">{setupError.message}</p>
          </div>
          <div className="w-full min-w-0 max-w-full space-y-2 md:max-w-sm">
            {onContinueAnyway && (
              <Button
                onClick={onContinueAnyway}
                disabled={isNavigating}
                className="h-11 min-h-11 w-full sm:h-10 sm:min-h-10"
              >
                Continue to workspace
              </Button>
            )}
            <LoadingButton
              onClick={onRetry}
              disabled={isNavigating}
              className="h-11 min-h-11 w-full gap-1.5 sm:h-10 sm:min-h-10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </LoadingButton>
          </div>
        </motion.div>
      </div>
    );
  }

  if (setupError.kind === "required-stage-failed") {
    return (
      <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-hide">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-destructive/[0.06] to-transparent"
          aria-hidden
        />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: PREVIEW_EASE }}
          className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-4 py-6 text-center"
        >
          <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            <ServerErrorIllustration />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
            <span className="text-dense font-semibold tracking-tight text-destructive">
              Setup blocked
            </span>
          </div>
          <div className="w-full min-w-0 max-w-full space-y-1.5 md:max-w-sm">
            <h2 className="min-w-0 w-full font-display text-[1.35rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
              <span className="block text-balance break-words">
                We couldn&apos;t finish setting up {workspaceLabel}
              </span>
            </h2>
            <p className="text-label text-muted-foreground">
              A required step failed. Nothing was lost — resume to pick up where you left off.
            </p>
          </div>
          <div
            role="alert"
            className="w-full min-w-0 max-w-full rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-center md:max-w-sm"
          >
            <p className="text-dense font-semibold uppercase tracking-[0.12em] text-destructive/80">
              What went wrong
            </p>
            <p className="mt-1 break-words text-label text-foreground">{setupError.message}</p>
          </div>
          <div className="w-full min-w-0 max-w-full space-y-2 md:max-w-sm">
            <LoadingButton
              onClick={onRetry}
              disabled={isNavigating}
              className="h-11 min-h-11 w-full gap-1.5 sm:h-10 sm:min-h-10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Resume setup
            </LoadingButton>
          </div>
        </motion.div>
      </div>
    );
  }

  const planLocked = setupError.kind === "module-not-in-plan";
  const orgExists = onOpenOrganization !== undefined && !planLocked;

  const title = orgExists
    ? `${workspaceLabel} is ready`
    : `We couldn't finish setting up ${workspaceLabel}`;
  const subtitle = planLocked
    ? "Return to your product choices and remove the unavailable product. Your answers and invitations are saved."
    : orgExists
    ? "Your organization was created — some invitations didn't go through. Jump in now or invite teammates later from People."
    : "Nothing was lost — your answers are saved. Retry to pick up where you left off.";

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-hide">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent",
          orgExists ? "from-amber-500/[0.06]" : "from-destructive/[0.06]",
        )}
        aria-hidden
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.12 : 0.32,
          ease: PREVIEW_EASE,
        }}
        className="relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col items-center justify-center gap-4 py-6 text-center"
      >
        <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
          <ServerErrorIllustration />
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
            orgExists
              ? "border-status-warning-rule bg-status-warning-surface"
              : "border-destructive/25 bg-destructive/10",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              orgExists ? "bg-status-warning-fill" : "bg-destructive",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "text-dense font-semibold tracking-tight",
              orgExists
                ? "text-status-warning-ink"
                : "text-destructive",
            )}
          >
            {orgExists ? "Invites failed" : "Launch interrupted"}
          </span>
        </div>

        <div className="w-full min-w-0 max-w-full space-y-1.5 md:max-w-sm">
          <h2 className="min-w-0 w-full font-display text-[1.35rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
            <span className="block text-balance break-words">{title}</span>
          </h2>
          <p className="text-label text-muted-foreground">{subtitle}</p>
        </div>

        <div
          role="alert"
          className="w-full min-w-0 max-w-full rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-center md:max-w-sm"
        >
          <p className="text-dense font-semibold uppercase tracking-[0.12em] text-destructive/80">
            What went wrong
          </p>
          <p className="mt-1 break-words text-label text-foreground">
            {setupError.message}
          </p>
        </div>

        <div className="w-full min-w-0 max-w-full space-y-2 md:max-w-sm">
          {planLocked && onBackToProducts ? (
            <Button
              onClick={onBackToProducts}
              disabled={isNavigating}
              className="h-11 min-h-11 w-full sm:h-10 sm:min-h-10"
            >
              Back to Products
            </Button>
          ) : (
            <LoadingButton
              onClick={onRetry}
              disabled={isNavigating}
              className="h-11 min-h-11 w-full gap-1.5 sm:h-10 sm:min-h-10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Try again
            </LoadingButton>
          )}

          {!planLocked && (onOpenOrganization || onGoToInvitations) && (
            <div className="flex flex-col gap-1.5 sm:flex-row">
              {onOpenOrganization && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenOrganization}
                  disabled={isNavigating}
                  className="h-9 flex-1"
                >
                  Open organization
                </Button>
              )}
              {onGoToInvitations && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGoToInvitations}
                  disabled={isNavigating}
                  className="h-9 flex-1"
                >
                  Invite from People
                </Button>
              )}
            </div>
          )}

          <p className="relative z-10 mt-2 text-dense text-muted-foreground">
            Still stuck? Email{" "}
            <a
              href={SUPPORT_MAILTO}
              onClick={handleSupportEmailClick}
              className="relative z-10 inline-block cursor-pointer font-medium text-foreground underline underline-offset-2 transition-colors hover:text-brand-deep dark:hover:text-brand-bright"
            >
              {BRAND_SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
