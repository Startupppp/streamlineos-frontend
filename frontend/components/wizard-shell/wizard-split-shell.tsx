"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WIZARD_COL_PAD } from "./constants";

type WizardSplitShellProps = {
  header?: ReactNode;
  children: ReactNode;
  brandColumn: ReactNode;
  direction: number;
  stepKey: string | number;
};

export function WizardSplitShell({
  header,
  children,
  brandColumn,
  direction,
  stepKey,
}: WizardSplitShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden md:flex-row">
      <div className="relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden md:w-1/2">
        <div
          className={cn(
            "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
            WIZARD_COL_PAD,
          )}
        >
          {header ? <div className="shrink-0">{header}</div> : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={stepKey}
                custom={direction}
                variants={{
                  initial: (d: number) => ({
                    opacity: 0,
                    x: reduceMotion ? 0 : d * 24,
                  }),
                  animate: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.22, ease: "easeOut" },
                  },
                  exit: (d: number) => ({
                    opacity: 0,
                    x: reduceMotion ? 0 : d * -24,
                    transition: { duration: 0.15, ease: "easeOut" },
                  }),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {brandColumn}
    </div>
  );
}
