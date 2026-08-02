"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandColumnFrame, WIZARD_EASE } from "@/components/wizard-shell";
import { BRAND_NAME } from "@/lib/branding";
import type { StepId } from "../lib/constants";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { WorkspacePreviewMock } from "./workspace-preview-mock";
import { WorkspaceWelcomeTeaser } from "./workspace-welcome-teaser";

type OrgSetupBrandColumnProps = {
  snapshot: WorkspacePreviewSnapshot;
  stepId: StepId;
};

function OrgSetupBrandColumnInner({
  snapshot,
  stepId,
}: OrgSetupBrandColumnProps) {
  const reduceMotion = useReducedMotion();
  const company = snapshot.companyName.trim();
  const isWelcome = stepId === "welcome";

  return (
    <BrandColumnFrame atmosphere={isWelcome ? "centered" : "default"}>
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: WIZARD_EASE }}
        className={
          isWelcome
            ? "mb-4 min-w-0 max-w-xl shrink-0 space-y-2 lg:mb-5"
            : "mb-3 min-w-0 max-w-lg shrink-0 space-y-1.5 lg:mb-4"
        }
      >
        {!isWelcome ? (
          <p className="text-xs font-medium text-brand-deep">
            Organization preview
          </p>
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={
              isWelcome
                ? `welcome-${company || "default"}`
                : company || "default"
            }
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 8,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : -6,
            }}
            transition={{ duration: 0.22, ease: WIZARD_EASE }}
            className={
              isWelcome
                ? "font-display text-[1.65rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground text-balance lg:text-[1.9rem] xl:text-[2.15rem] 2xl:text-[2.35rem]"
                : "font-display text-[1.35rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance lg:text-[1.55rem] 2xl:text-[1.85rem]"
            }
          >
            {isWelcome ? (
              company ? (
                <>
                  <span className="brand-sweep">{company}</span>
                  <span className="block text-foreground">
                    is about to go live
                  </span>
                </>
              ) : (
                <>
                  One OS.
                  <span className="block">
                    Your company on{" "}
                    <span className="brand-sweep">{BRAND_NAME}</span>
                  </span>
                </>
              )
            ) : company ? (
              <>
                Building <span className="brand-sweep">{company}</span>
              </>
            ) : (
              <>
                Your company, on{" "}
                <span className="brand-sweep">{BRAND_NAME}</span>
              </>
            )}
          </motion.h2>
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={
              isWelcome
                ? "welcome-copy"
                : snapshot.goals.length > 0
                  ? "shaped"
                  : "idle"
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: WIZARD_EASE }}
            className={
              isWelcome
                ? "max-w-md text-[13px] leading-relaxed text-muted-foreground lg:text-sm"
                : "max-w-sm text-[13px] leading-relaxed text-muted-foreground"
            }
          >
            {isWelcome
              ? "Answer a few questions. The shell shapes around your team — modules, defaults, and roles."
              : snapshot.goals.length > 0
                ? "Sidebar and dashboard mirror the goals you pick."
                : "Watch your organization take shape as you answer. Nothing here is permanent."}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch pb-1">
        <AnimatePresence mode="wait" initial={false}>
          {isWelcome ? (
            <motion.div
              key="welcome-teaser"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{
                duration: reduceMotion ? 0.12 : 0.28,
                ease: WIZARD_EASE,
              }}
              className="flex h-full min-h-0 w-full min-w-0"
            >
              <WorkspaceWelcomeTeaser
                companyName={company}
                className="h-full w-full max-w-none"
              />
            </motion.div>
          ) : (
            <motion.div
              key="live-preview"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={{
                duration: reduceMotion ? 0.12 : 0.28,
                ease: WIZARD_EASE,
              }}
              className="flex h-full min-h-0 w-full min-w-0"
            >
              <WorkspacePreviewMock
                snapshot={snapshot}
                className="h-full w-full max-w-none lg:max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BrandColumnFrame>
  );
}

export const OrgSetupBrandColumn = memo(
  OrgSetupBrandColumnInner,
  (prev, next) =>
    prev.stepId === next.stepId &&
    previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
