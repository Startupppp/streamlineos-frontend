"use client";

import { useMemo, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { WizardSplitShell } from "@/components/wizard-shell";
import { Button } from "@/components/ui/button";
import { STEP_SUBTITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";
import type { SyncStatus } from "../lib/draft";
import { toPreviewSnapshot } from "../lib/preview-snapshot";
import type { WizardData } from "../lib/wizard-data-schema";
import { OrgSetupBrandColumn } from "./org-setup-brand-column";

type OrgSetupShellProps = {
  sequence: StepId[];
  currentIndex: number;
  title: string;
  direction: number;
  syncStatus?: SyncStatus;
  data: WizardData;
  onRetrySave?: () => void;
  children: ReactNode;
};

const SYNC_STATUS_LABEL: Record<SyncStatus, string> = {
  synced: "Saved",
  saving: "Saving…",
  unsynced: "Saving…",
  error: "Save failed",
};

export function OrgSetupShell({
  sequence,
  currentIndex,
  title,
  direction,
  syncStatus,
  data,
  onRetrySave,
  children,
}: OrgSetupShellProps) {
  const reduceMotion = useReducedMotion();
  const currentStepId = sequence[currentIndex] ?? "workspace";
  const previewSnapshot = useMemo(() => toPreviewSnapshot(data), [data]);

  return (
    <WizardSplitShell
      direction={direction}
      stepKey={currentIndex}
      brandColumn={
        <OrgSetupBrandColumn snapshot={previewSnapshot} />
      }
      header={
        <div className="mb-2 min-w-0 space-y-0.5">
          <div className="flex min-w-0 items-baseline gap-3">
            <AnimatePresence mode="wait">
              <motion.h1
                key={title}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground text-balance sm:text-2xl"
              >
                {title}
              </motion.h1>
            </AnimatePresence>
            {syncStatus === "error" && onRetrySave ? (
              <span role="alert" className="flex items-center gap-1 text-xs text-destructive">
                Couldn&apos;t save —
                <Button
                  type="button"
                  variant="link"
                  onClick={onRetrySave}
                  className="h-auto p-0 text-xs text-destructive"
                >
                  Retry
                </Button>
              </span>
            ) : syncStatus && (
              <span
                aria-live="polite"
                className={
                  syncStatus === "error"
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {SYNC_STATUS_LABEL[syncStatus]}
              </span>
            )}
          </div>
          <p className="text-sm leading-5 text-muted-foreground text-pretty">
            {STEP_SUBTITLES[currentStepId]}
          </p>
        </div>
      }
    >
      {children}
    </WizardSplitShell>
  );
}
