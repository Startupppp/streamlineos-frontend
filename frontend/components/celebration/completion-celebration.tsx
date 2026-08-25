"use client";

import { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfettiOverlay } from "@/components/celebration/confetti-overlay";

type CelebrationHighlight = { icon: LucideIcon; label: string };

type CompletionCelebrationProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: CelebrationHighlight[];
  ctaLabel: string;
  onContinue: () => void;
  isContinuing?: boolean;
  footnote?: string;
  autoAdvanceMs?: number;
};

export function CompletionCelebration({
  icon: Icon,
  title,
  description,
  highlights,
  ctaLabel,
  onContinue,
  isContinuing = false,
  footnote,
  autoAdvanceMs = 12_000,
}: CompletionCelebrationProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!isContinuing) onContinue();
    }, autoAdvanceMs);
    return () => window.clearTimeout(t);
  }, [onContinue, isContinuing, autoAdvanceMs]);

  const confettiDone = useMemo(() => () => {}, []);

  return (
    <>
      <ConfettiOverlay onDone={confettiDone} durationMs={4500} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-celebration-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-muted" />

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border bg-card shadow-lg"
        >
          <div className="px-6 pt-8 pb-6 text-center space-y-5">
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.08 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-core text-white shadow-sm"
            >
              <Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />
            </motion.div>

            <div className="space-y-1.5">
              <h2
                id="completion-celebration-title"
                className="font-display text-2xl font-extrabold tracking-tight text-foreground"
              >
                {title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {description}
              </p>
            </div>

            <ul className="space-y-2 text-left max-w-xs mx-auto">
              {highlights.map(({ icon: HighlightIcon, label }, i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: reduceMotion ? 0 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07, duration: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-label text-foreground"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-core/10 text-brand-core dark:bg-brand-core/15 dark:text-brand-bright">
                    <HighlightIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {label}
                </motion.li>
              ))}
            </ul>

            <div className="pt-1 space-y-2">
              <LoadingButton
                type="button"
                size="lg"
                className="w-full h-11 text-sm font-semibold gap-2"
                onClick={onContinue}
                isPending={isContinuing}
                loadingText="Opening…"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </LoadingButton>
              {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
