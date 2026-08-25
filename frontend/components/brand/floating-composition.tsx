"use client";

import { memo, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

type FloatingCompositionProps = {
  className?: string;
  size?: "auth" | "hero";
};

export const FloatingComposition = memo(function FloatingComposition({
  className,
  size = "auth",
}: FloatingCompositionProps) {
  const reduce = useReducedMotion();
  const isHero = size === "hero";

  return (
    <div
      className={cn(
        "relative w-full",
        isHero ? "max-w-[560px] aspect-[5/4] sm:aspect-[11/9]" : "max-w-[420px] aspect-[5/4]",
        className,
      )}
      aria-hidden
    >
      <div className="absolute -inset-6 sm:-inset-10 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-bright/35 via-brand-cyan/20 to-transparent blur-2xl" />

      <motion.div
        initial={reduce ? false : { opacity: 0, x: -28, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE_OUT_QUART }}
        className={cn(
          "absolute top-0 left-0 z-20 rounded-2xl border border-border bg-white/92 backdrop-blur-sm shadow-[0_22px_50px_-22px_rgba(30,64,175,0.22)] -rotate-[3deg]",
          isHero ? "w-[min(240px,46%)] p-4" : "w-[230px] p-4",
        )}
      >
        <FloatLayer reduce={reduce} amplitude={3} duration={7}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-micro font-medium text-brand-core">Sprint 24</span>
            <span className="text-micro font-mono text-muted-foreground">12/24</span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 leading-tight">
            Ship onboarding v3
          </p>
          <div className="space-y-1.5">
            {[
              { label: "Schema migration", done: true },
              { label: "Sign flow QA", done: true },
              { label: "Email templates", done: false },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 text-[10.5px]">
                <span
                  className={cn(
                    "h-3 w-3 rounded-[3px] border inline-flex items-center justify-center shrink-0",
                    t.done
                      ? "bg-brand-core border-brand-core"
                      : "border-border bg-white",
                  )}
                >
                  {t.done && (
                    <CheckCircle2 className="h-2 w-2 text-white" strokeWidth={3} />
                  )}
                </span>
                <span className={t.done ? "text-muted-foreground line-through" : "text-muted-foreground"}>
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </FloatLayer>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.05, ease: EASE_OUT_QUART }}
        className="absolute top-[16%] left-[18%] right-0 z-10 sm:left-[22%]"
      >
        <FloatLayer reduce={reduce} amplitude={2} duration={6}>
          <div className="rounded-2xl border border-border bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-[0_28px_60px_-22px_rgba(30,64,175,0.28)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-brand-core" />
                <span className="text-dense font-medium text-muted-foreground">
                  Pipeline · Q2
                </span>
              </div>
              <span className="text-micro font-mono text-status-success-ink px-1.5 py-0.5 rounded bg-status-success-surface border border-status-success-rule">
                +12.4%
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "New", count: 142, pct: 100, bar: "from-brand-core to-brand-deep" },
                { label: "Qualified", count: 86, pct: 72, bar: "from-brand-core to-brand-cyan" },
                { label: "Proposal", count: 41, pct: 48, bar: "from-brand-cyan to-teal-400" },
                { label: "Closed Won", count: 18, pct: 28, bar: "from-teal-400 to-emerald-400" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.35 + i * 0.07 }}
                >
                  <div className="flex justify-between text-dense mb-1">
                    <span className="text-muted-foreground font-medium">{s.label}</span>
                    <span className="text-muted-foreground font-mono">{s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={reduce ? { width: `${s.pct}%` } : { width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{
                        duration: reduce ? 0 : 1,
                        delay: reduce ? 0 : 0.45 + i * 0.07,
                        ease: EASE_OUT_QUART,
                      }}
                      className={cn("h-full rounded-full bg-gradient-to-r", s.bar)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-micro">
              <span className="text-muted-foreground font-medium">Forecast</span>
              <span className="font-mono text-muted-foreground font-semibold">$2.4M ARR</span>
            </div>
          </div>
        </FloatLayer>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, x: 28, y: -12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT_QUART }}
        className={cn(
          "absolute bottom-0 right-0 z-20 rounded-2xl border border-border bg-white/92 backdrop-blur-sm shadow-[0_22px_50px_-22px_rgba(6,182,212,0.25)] rotate-[3deg]",
          isHero ? "w-[min(210px,42%)] p-4" : "w-[200px] p-4",
        )}
      >
        <FloatLayer reduce={reduce} amplitude={2.5} duration={8}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-brand-cyan" />
              <span className="text-micro font-medium text-muted-foreground">Attendance</span>
            </div>
            <span className="text-micro font-mono text-status-success-ink px-1.5 py-0.5 rounded bg-status-success-surface">
              94%
            </span>
          </div>
          <p className="font-display text-2xl font-extrabold text-muted-foreground leading-none mb-2.5">
            47<span className="text-sm font-bold text-muted-foreground">/52</span>
          </p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }).map((_, i) => {
              const intensity = [0.25, 0.45, 0.7, 0.9, 1, 0.8, 0.55][i % 7] ?? 0.5;
              return (
                <div
                  key={i}
                  className="aspect-square rounded-[3px] bg-brand-core"
                  style={{ opacity: intensity }}
                />
              );
            })}
          </div>
        </FloatLayer>
      </motion.div>
    </div>
  );
});

function FloatLayer({
  children,
  reduce,
  amplitude,
  duration,
}: {
  children: ReactNode;
  reduce: boolean | null;
  amplitude: number;
  duration: number;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      animate={{ y: [-amplitude, amplitude, -amplitude] }}
      transition={{ duration, ease: "easeInOut", repeat: Infinity }}
    >
      {children}
    </motion.div>
  );
}
