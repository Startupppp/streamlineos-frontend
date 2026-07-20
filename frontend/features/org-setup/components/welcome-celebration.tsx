"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, PartyPopper, Sparkles, LayoutDashboard } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfettiOverlay } from "@/features/crm/deals/confetti-overlay";

type WelcomeCelebrationProps = {
  companyName?: string;
  onContinue: () => void;
  isContinuing?: boolean;
};

const HIGHLIGHTS = [
  { icon: LayoutDashboard, label: "Your dashboard is ready" },
  { icon: Sparkles, label: "Modules and defaults are in place" },
  { icon: PartyPopper, label: "Invite teammates anytime from Users" },
];

export function WelcomeCelebration({
  companyName,
  onContinue,
  isContinuing = false,
}: WelcomeCelebrationProps) {
  const displayName = companyName?.trim() || "your workspace";

  // Auto-advance if the user doesn't interact (keeps flow unstuck).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!isContinuing) onContinue();
    }, 12_000);
    return () => window.clearTimeout(t);
  }, [onContinue, isContinuing]);

  const confettiDone = useMemo(() => () => {}, []);

  return (
    <>
      <ConfettiOverlay onDone={confettiDone} durationMs={4500} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-celebration-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-card shadow-[0_24px_80px_-20px_rgba(30,64,175,0.45)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50/80 dark:from-blue-950/40 dark:via-card dark:to-cyan-950/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl"
          />

          <div className="relative px-6 pt-8 pb-6 text-center space-y-5">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.08 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
            >
              <PartyPopper className="h-8 w-8" strokeWidth={1.75} />
            </motion.div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                You&apos;re in
              </p>
              <h2
                id="welcome-celebration-title"
                className="font-display text-2xl font-extrabold tracking-tight text-foreground"
              >
                Welcome to {displayName}!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Your workspace is ready. Jump in and start running HR, CRM, projects,
                and more from one place.
              </p>
            </div>

            <ul className="space-y-2 text-left max-w-xs mx-auto">
              {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-[13px] text-foreground"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </motion.li>
              ))}
            </ul>

            <div className="pt-1 space-y-2">
              <LoadingButton
                type="button"
                size="lg"
                className="w-full h-11 text-sm font-semibold gap-2 shadow-md"
                onClick={onContinue}
                isPending={isContinuing}
                loadingText="Opening…"
              >
                Open my workspace
                <ArrowRight className="h-4 w-4" />
              </LoadingButton>
              <p className="text-[11px] text-muted-foreground">
                You can invite teammates and finish setup tips anytime.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
