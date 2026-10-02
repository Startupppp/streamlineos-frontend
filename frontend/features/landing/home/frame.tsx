import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The dark product window every mockup on the landing page sits in.
 *
 * Mockups are illustrations built from markup, not screenshots, so the frame is
 * one `role="img"` with a description and says "Sample data" on its own chrome.
 */
export function Frame({
  crumb,
  label,
  className,
  children,
}: {
  crumb: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "lp-frame select-none overflow-hidden rounded-2xl border border-(--lpf-rule) bg-(--lpf-bg) text-left text-(--lpf-ink)",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-(--lpf-rule) px-4 py-2.5 text-xs">
        <span className="truncate text-(--lpf-dim)">
          Meridian Works <span className="mx-1 opacity-50">/</span>{" "}
          <span className="text-(--lpf-ink)">{crumb}</span>
        </span>
        <span className="shrink-0 rounded-full border border-(--lpf-rule) px-2 py-0.5 text-micro text-(--lpf-dim)">
          Sample data
        </span>
      </div>
      {children}
    </div>
  );
}

export function Panel({
  title,
  meta,
  className,
  children,
}: {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-(--lpf-rule) bg-(--lpf-panel) p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="truncate text-label font-medium">{title}</span>
        {meta ? (
          <span className="shrink-0 text-dense tabular-nums text-(--lpf-dim)">{meta}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * A shared record. The same customer, project or person is highlighted the
 * same way in every mockup, which is the page's whole argument.
 */
export function Rec({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-(--lpf-accent)/40 bg-(--lpf-accent)/10 px-1.5 py-0.5 text-(--lpf-accent)">
      {children}
    </span>
  );
}

const TAG_TONES = {
  neutral: "bg-(--lpf-raise) text-(--lpf-dim)",
  accent: "bg-(--lpf-accent)/15 text-(--lpf-accent)",
  good: "bg-(--lpf-good)/15 text-(--lpf-good)",
  warn: "bg-(--lpf-warn)/15 text-(--lpf-warn)",
};

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TAG_TONES;
  children: ReactNode;
}) {
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-micro", TAG_TONES[tone])}>
      {children}
    </span>
  );
}

export function Row({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-(--lpf-rule) py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="truncate text-xs">{title}</div>
        {sub ? <div className="mt-0.5 truncate text-dense text-(--lpf-dim)">{sub}</div> : null}
      </div>
      {right ? (
        <div className="shrink-0 text-xs tabular-nums text-(--lpf-dim)">{right}</div>
      ) : null}
    </div>
  );
}

export function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-(--lpf-raise)">
      <div className="h-full rounded-full bg-(--lpf-accent)" style={{ width: `${pct}%` }} />
    </div>
  );
}
