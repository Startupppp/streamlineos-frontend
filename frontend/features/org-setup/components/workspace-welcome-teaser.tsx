"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PREVIEW_EASE } from "../lib/preview-motion";
import { WelcomeBootStage } from "./welcome-boot-stage";

type WorkspaceWelcomeTeaserProps = {
  companyName: string;
  className?: string;
};

function WorkspaceWelcomeTeaserInner({
  companyName,
  className,
}: WorkspaceWelcomeTeaserProps) {
  const reduceMotion = useReducedMotion();
  const workspaceLabel = companyName.trim() || "your organization";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.15 : 0.5,
          ease: PREVIEW_EASE,
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <WelcomeBootStage
          workspaceLabel={workspaceLabel}
          className="min-h-0 flex-1"
        />

        <motion.p
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduceMotion ? 0.12 : 0.4,
            delay: reduceMotion ? 0 : 0.35,
            ease: PREVIEW_EASE,
          }}
          className="mt-3 shrink-0 px-1 text-center font-display text-label font-semibold tracking-tight text-foreground text-balance lg:text-sm"
        >
          Watch <span className="brand-sweep">{workspaceLabel}</span> come
          online — modules, defaults, and roles assemble as you answer.
        </motion.p>
      </motion.div>
    </div>
  );
}

export const WorkspaceWelcomeTeaser = memo(
  WorkspaceWelcomeTeaserInner,
  (prev, next) =>
    prev.companyName === next.companyName && prev.className === next.className,
);
