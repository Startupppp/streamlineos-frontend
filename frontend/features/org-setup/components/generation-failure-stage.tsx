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
  | { kind: "invites-failed"; message: string };

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
  onOpenOrganization?: () => void;
  onGoToInvitations?: () => void;
  isNavigating?: boolean;
};

export function GenerationFailureStage({
  workspaceLabel,
  setupError,
  onRetry,
  onOpenOrganization,
  onGoToInvitations,
  isNavigating = false,
}: GenerationFailureStageProps) {
  const reduceMotion = useReducedMotion();
  const orgExists = onOpenOrganization !== undefined;

  const title = orgExists
    ? `${workspaceLabel} is ready`
    : `We couldn't finish setting up ${workspaceLabel}`;
  const subtitle = orgExists
    ? "Your organization was created — some invitations didn't go through. Jump in now or invite teammates later from the Users area."
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
              ? "border-amber-200/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
              : "border-destructive/25 bg-destructive/10",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              orgExists ? "bg-amber-500 dark:bg-amber-400" : "bg-destructive",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "text-[11px] font-semibold tracking-tight",
              orgExists
                ? "text-amber-700 dark:text-amber-400"
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
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        </div>

        <div
          role="alert"
          className="w-full min-w-0 max-w-full rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-center md:max-w-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-destructive/80">
            What went wrong
          </p>
          <p className="mt-1 break-words text-[13px] text-foreground">
            {setupError.message}
          </p>
        </div>

        <div className="w-full min-w-0 max-w-full space-y-2 md:max-w-sm">
          <LoadingButton
            onClick={onRetry}
            disabled={isNavigating}
            className="h-11 min-h-11 w-full gap-1.5 sm:h-10 sm:min-h-10"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </LoadingButton>

          {(onOpenOrganization || onGoToInvitations) && (
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
                  Invite from Users
                </Button>
              )}
            </div>
          )}

          <p className="relative z-10 mt-2 text-[11px] text-muted-foreground">
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
