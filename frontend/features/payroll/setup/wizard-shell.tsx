"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type WizardShellProps = {
  step: number;
  totalSteps: number;
  title: string;
  direction: number;
  children: ReactNode;
};

export function WizardShell({ step, totalSteps, title, direction, children }: WizardShellProps) {
  return (
    <div className="w-full space-y-4">
      <div className="text-center space-y-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={title}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="text-sm text-muted-foreground"
          >
            Step {step} of {totalSteps}
          </motion.p>
        </AnimatePresence>
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              className={cn("h-1 flex-1 rounded-full", i < step ? "bg-primary" : "bg-border")}
              animate={{ opacity: i < step ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              initial: (d: number) => ({ opacity: 0, x: d * 24 }),
              animate: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -24 }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="p-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
