"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Banknote,
} from "lucide-react";

export type ReadinessLevel =
  | "READY"
  | "BLOCKED"
  | "ATTENTION"
  | "PROCESSING"
  | "UNKNOWN";

export interface ReadinessTotals {
  gross?: string;
  deductions?: string;
  net?: string;
  employees?: number;
}

export interface ReadinessRailProps {
  canPay: boolean;
  level?: ReadinessLevel;
  blockers: { id: string; label: string; href?: string }[];
  warnings?: { id: string; label: string; href?: string }[];
  changes?: { id: string; label: string }[];
  nextAction?: { label: string; href?: string; onClick?: () => void };
  summary?: string;
  totals?: ReadinessTotals;
  payDate?: string | null;
  cutoffLabel?: string | null;
  ruleVersion?: string | null;
  progressPercent?: number | null;
  className?: string;
  /** Sticky right rail on desktop command center */
  variant?: "card" | "rail";
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
  warnings = [],
  changes = [],
  nextAction,
  summary,
  totals,
  payDate,
  cutoffLabel,
  ruleVersion,
  progressPercent,
  className,
  variant = "card",
}: ReadinessRailProps) {
  const resolvedLevel: ReadinessLevel =
    level ??
    (progressPercent != null && progressPercent < 100
      ? "PROCESSING"
      : canPay
        ? blockers.length === 0
          ? "READY"
          : "ATTENTION"
        : "BLOCKED");

  const tone =
    resolvedLevel === "READY"
      ? {
          shell: "payroll-ready",
          bar: "bg-[var(--payroll-mint-fg)]",
          icon: CheckCircle2,
          title: "Ready to pay",
          badge: "Safe",
        }
      : resolvedLevel === "PROCESSING"
        ? {
            shell: "border-[var(--payroll-ledger)]/30 bg-[color-mix(in_srgb,var(--payroll-ledger)_8%,transparent)]",
            bar: "bg-[var(--payroll-ledger)]",
            icon: Loader2,
            title: "Processing",
            badge: "In progress",
          }
        : resolvedLevel === "BLOCKED"
          ? {
              shell: "payroll-blocked",
              bar: "bg-[var(--payroll-control)]",
              icon: ShieldAlert,
              title: "Not safe to pay",
              badge: "Blocked",
            }
          : {
              shell: "payroll-attention",
              bar: "bg-[var(--payroll-audit)]",
              icon: AlertTriangle,
              title: "Needs attention",
              badge: "Review",
            };

  const Icon = tone.icon;

  return (
    <section
      aria-label="Payroll readiness"
      className={cn(
        "relative overflow-hidden rounded-xl border payroll-rail",
        tone.shell,
        variant === "rail" && "lg:sticky lg:top-4",
        className,
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} aria-hidden />
      <div className="pl-4 pr-3 py-3.5 sm:pl-5 sm:pr-4 space-y-3.5">
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              "h-5 w-5 shrink-0 mt-0.5",
              resolvedLevel === "PROCESSING" && "animate-spin",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {tone.title}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  canPay
                    ? "border-emerald-400/50 text-emerald-800 dark:text-emerald-200"
                    : "border-red-400/40 text-red-800 dark:text-red-200",
                )}
              >
                {canPay ? "Can pay" : "Cannot pay"}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {tone.badge}
              </span>
            </div>
            {summary ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
            ) : null}
            {progressPercent != null && progressPercent < 100 ? (
              <div className="pt-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--payroll-ledger)] transition-[width] duration-500"
                    style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 payroll-money">
                  {progressPercent}% complete
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {totals ? (
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/70 bg-background/60 p-2.5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Gross</p>
              <p className="payroll-money text-xs font-semibold truncate">{totals.gross ?? "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ded.</p>
              <p className="payroll-money text-xs font-semibold truncate text-[var(--payroll-control)]">
                {totals.deductions ?? "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Banknote className="h-3 w-3" /> Net
              </p>
              <p className="payroll-money text-xs font-semibold truncate payroll-ledger-text">
                {totals.net ?? "—"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blockers{blockers.length ? ` · ${blockers.length}` : ""}
            </p>
            {blockers.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              <ul className="space-y-1">
                {blockers.slice(0, 4).map((b) => (
                  <li
                    key={b.id}
                    className="text-xs font-medium text-foreground flex items-start gap-1.5"
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--payroll-control)] shrink-0" />
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="hover:underline text-primary min-w-0 break-words"
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span className="min-w-0 break-words">{b.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {warnings.length > 0 ? (
              <p className="text-[11px] text-muted-foreground pt-1">
                +{warnings.length} warning{warnings.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Changes
            </p>
            {changes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No material changes</p>
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold payroll-ledger-text hover:underline min-h-9"
                >
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={nextAction.onClick}
                  className="h-auto min-h-9 px-0 py-0 inline-flex items-center gap-1.5 text-xs font-semibold payroll-ledger-text hover:bg-transparent hover:underline"
                >
                  {nextAction.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">No action required</p>
            )}
            {(payDate || cutoffLabel || ruleVersion) && (
              <div className="pt-1 space-y-0.5 text-[10px] text-muted-foreground">
                {payDate ? <p className="payroll-money">Pay date · {payDate}</p> : null}
                {cutoffLabel ? <p>{cutoffLabel}</p> : null}
                {ruleVersion ? (
                  <p className="payroll-money opacity-80">Rules · {ruleVersion}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
