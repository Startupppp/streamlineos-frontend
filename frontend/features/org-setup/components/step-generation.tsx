"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { WizardData } from "../lib/types";
import { GENERATION_STEPS } from "../lib/constants";

type StepGenerationProps = {
  data: WizardData;
  onNext: () => void;
};

export function StepGeneration({ data, onNext }: StepGenerationProps) {
  const { update } = useSession();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const dataRef = useRef<WizardData>(data);
  const updateRef = useRef(update);
  const onNextRef = useRef(onNext);
  dataRef.current = data;
  updateRef.current = update;
  onNextRef.current = onNext;

  const total = GENERATION_STEPS.length;
  const HOLD_AT = total - 1;

  useEffect(() => {
    let cancelled = false;
    let apiDone = false;
    let count = 0;

    setCompletedSteps(0);
    setError(null);

    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return; }
      if (count >= HOLD_AT && !apiDone) return;
      count += 1;
      setCompletedSteps(count);
      if (count >= total) clearInterval(interval);
    }, 650);

    const d = dataRef.current;
    apiClient
      .patch<{ orgId?: string }>("/org/setup", {
        goals: d.goals,
        industry: d.industry,
        companyName: d.companyName,
        companySize: d.teamSize,
        ...(d.country ? { country: d.country } : {}),
        ...(d.timezone ? { timezone: d.timezone } : {}),
        enabledModules: d.installedApps.length > 0 ? d.installedApps : ["HR", "CRM", "PROJECTS"],
        invitees: d.invitees,
      })
      .then(async (res) => {
        if (cancelled) return;
        apiDone = true;
        clearInterval(interval);
        setCompletedSteps(total);
        const orgId = res?.orgId ?? null;
        try {
          await updateRef.current({
            ...(orgId ? { orgId } : {}),
            orgOnboardingCompletedAt: new Date().toISOString(),
            isOrgOwner: true,
          });
        } catch {}
        setTimeout(() => onNextRef.current(), 600);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearInterval(interval);
        setError(getErrorMessage(err));
      });

    return () => { cancelled = true; clearInterval(interval); };
  }, [attempt, total, HOLD_AT]);

  function handleRetry() {
    setAttempt((a) => a + 1);
  }

  const progress = Math.round((completedSteps / total) * 100);
  const companyName = dataRef.current.companyName?.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-foreground">
          {companyName ? `Setting up ${companyName}` : "Setting up your workspace"}
        </p>

        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-wizard rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {completedSteps < total
              ? GENERATION_STEPS[completedSteps] ?? "Finishing up…"
              : "All done!"}
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground">{progress}%</p>
        </div>
      </div>

      <ul className="space-y-1" aria-label="Setup progress">
        {GENERATION_STEPS.map((label, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps && !error;
          const pending = i > completedSteps;

          return (
            <motion.li
              key={label}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors duration-300",
                active && "bg-blue-50",
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  done ? "bg-foreground" : active ? "bg-blue-100" : "bg-muted",
                )}
              >
                <AnimatePresence mode="wait">
                  {done ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    >
                      <Check className="h-3 w-3 text-background stroke-[2.5]" />
                    </motion.span>
                  ) : active ? (
                    <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                    </motion.span>
                  ) : (
                    <span key="dot" className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </AnimatePresence>
              </span>

              <span
                className={cn(
                  "text-[13px] transition-colors duration-300",
                  done && "text-foreground font-medium",
                  active && "text-blue-700 font-medium",
                  pending && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2"
          >
            <p className="text-[13px] text-destructive">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
