"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

export type ReadinessLevel = "READY" | "BLOCKED" | "ATTENTION" | "UNKNOWN";

export interface ReadinessRailProps {
  /** Can I safely pay? */
  canPay: boolean;
  level?: ReadinessLevel;
  /** What is blocking me? */
  blockers: { id: string; label: string; href?: string }[];
  /** What changed? */
  changes?: { id: string; label: string }[];
  /** What should I do next? */
  nextAction?: { label: string; href?: string; onClick?: () => void };
  summary?: string;
  className?: string;
}

/**
 * Signature PayrollOS component — every high-risk screen answers:
 * 1. Can I safely pay?
 * 2. What is blocking me?
 * 3. What changed?
 * 4. What should I do next?
 */
export function ReadinessRail({
  canPay,
  level,
  blockers,
  changes = [],
  nextAction,
  summary,
  className,
}: ReadinessRailProps) {
  const resolvedLevel: ReadinessLevel =
    level ?? (canPay ? (blockers.length === 0 ? "READY" : "ATTENTION") : "BLOCKED");

  const tone =
    resolvedLevel === "READY"
      ? {
          bar: "bg-emerald-500",
          bg: "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
          label: "text-emerald-800 dark:text-emerald-200",
          icon: CheckCircle2,
          title: "Safe to pay",
        }
      : resolvedLevel === "BLOCKED"
        ? {
            bar: "bg-red-500",
            bg: "bg-red-50/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/30",
            label: "text-red-800 dark:text-red-200",
            icon: ShieldAlert,
            title: "Not safe to pay",
          }
        : {
            bar: "bg-amber-500",
            bg: "bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
            label: "text-amber-900 dark:text-amber-200",
            icon: AlertTriangle,
            title: "Needs attention",
          };

  const Icon = tone.icon;

  return (
    <section
      aria-label="Payroll readiness"
      className={cn(
        "relative overflow-hidden rounded-xl border",
        tone.bg,
        className,
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} aria-hidden />
      <div className="pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", tone.label)} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn("text-sm font-semibold tracking-tight", tone.label)}>
                {tone.title}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  canPay
                    ? "border-emerald-300 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200"
                    : "border-red-300 text-red-800 dark:border-red-500/40 dark:text-red-200",
                )}
              >
                {canPay ? "Can pay" : "Cannot pay"}
              </span>
            </div>
            {summary ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blockers
            </p>
            {blockers.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {blockers.slice(0, 4).map((b) => (
                  <li key={b.id} className="text-xs font-medium text-foreground flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    {b.href ? (
                      <Link href={b.href} className="hover:underline text-primary min-w-0 break-words">
                        {b.label}
                      </Link>
                    ) : (
                      <span className="min-w-0 break-words">{b.label}</span>
                    )}
                  </li>
                ))}
                {blockers.length > 4 ? (
                  <li className="text-[11px] text-muted-foreground">+{blockers.length - 4} more</li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Changes
            </p>
            {changes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No material changes flagged</p>
            ) : (
              <ul className="space-y-1">
                {changes.slice(0, 4).map((c) => (
                  <li key={c.id} className="text-xs text-foreground break-words">
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next action
            </p>
            {nextAction ? (
              nextAction.href ? (
                <Link
                  href={nextAction.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline min-h-9"
                >
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={nextAction.onClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline min-h-9"
                >
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">No action required</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
