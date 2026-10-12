"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const BAR_TRANSITION = { duration: 0.35, ease: [0.25, 1, 0.5, 1] } as const;

export function OverviewSectionLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
    >
      {children}
    </Link>
  );
}

interface OverviewPanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function OverviewPanel({ title, description, action, children, className }: OverviewPanelProps) {
  return (
    <section
      aria-label={title}
      className={cn("flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4", className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function OverviewFact({
  label,
  children,
  className,
  href,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  href?: string;
}) {
  const inner = (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-sm tabular-nums text-foreground">{children}</dd>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "flex min-h-11 items-center justify-between gap-4 border-b border-border/80 py-2 transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-4 border-b border-border/80 py-2 last:border-b-0",
        className,
      )}
    >
      {inner}
    </div>
  );
}

export function OverviewRecordLink({
  href,
  title,
  trailing,
}: {
  href: string;
  title: string;
  trailing: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 min-w-0 items-center justify-between gap-3 border-b border-border/80 py-2 text-sm transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate">{title}</span>
      <span className="flex shrink-0 items-center gap-2">{trailing}</span>
    </Link>
  );
}

interface OverviewMeterProps {
  label: string;
  percent: number;
  fillClassName?: string;
  className?: string;
}

export function OverviewMeter({ label, percent, fillClassName, className }: OverviewMeterProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <motion.div
        className={cn("h-full origin-left rounded-full bg-primary", fillClassName)}
        style={{ width: `${clamped}%` }}
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={BAR_TRANSITION}
      />
    </div>
  );
}

export interface OverviewSegment {
  id: string;
  label: string;
  value: number;
  fillClassName: string;
}

interface OverviewSegmentedBarProps {
  label: string;
  segments: ReadonlyArray<OverviewSegment>;
  className?: string;
}

export function OverviewSegmentedBar({ label, segments, className }: OverviewSegmentedBarProps) {
  const reduceMotion = useReducedMotion();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {total > 0
          ? segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <motion.span
                  key={segment.id}
                  className={cn("h-full origin-left first:rounded-l-full last:rounded-r-full", segment.fillClassName)}
                  style={{ width: `${(segment.value / total) * 100}%` }}
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={BAR_TRANSITION}
                />
              ))
          : null}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className={cn("size-2 rounded-full", segment.fillClassName)} />
            {segment.label}
            <span className="font-mono tabular-nums text-foreground">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
