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

export function WizardShell({
  step,
  totalSteps,
  title,
  direction,
  children,
}: WizardShellProps) {
  const showMeta = step > 1 && step < totalSteps;
  const activeSteps = totalSteps - 2;
  const filled = step - 1;

  return (
    <div className="w-full space-y-4">
      <div className="text-center space-y-1">
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {step === 1 ? (
              <>
                {title.includes(",") ? (
                  <>
                    {title.split(",")[0]},
                    <span className="brand-text"> {title.split(",")[1]?.trim()}</span>
                  </>
                ) : (
                  title
                )}
              </>
            ) : (
              title
            )}
          </motion.h1>
        </AnimatePresence>

        {showMeta && (
          <p className="text-[12px] text-muted-foreground">
            Step {step - 1} of {activeSteps}
          </p>
        )}
      </div>

      {showMeta && (
        <div
          className="flex gap-0.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label="Setup progress"
        >
          {Array.from({ length: activeSteps }).map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < filled ? "gradient-wizard" : "bg-border",
              )}
              animate={{ opacity: i < filled ? 1 : 0.5 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      )}

      <div className={cn(
        "bg-card rounded-xl border border-border shadow-soft",
        step === 1 || step === totalSteps ? "p-5" : "p-4",
      )}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              initial: (d: number) => ({ opacity: 0, x: d * 20 }),
              animate: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -20 }),
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
