"use client";

import { cn } from "@/lib/utils";
import { statusToneClasses, typeScaleClass, type StatusTone } from "@/lib/design-tokens";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";

export interface SlaTarget {
  label: string;
  value: number | null;
  format: "rate" | "hours";
  meets: number;
  watches: number;
  basis: string;
}

function band(target: SlaTarget): { tone: StatusTone; verdict: string } {
  if (target.value === null) return { tone: "neutral", verdict: "Nothing measured" };
  if (target.value <= target.meets) return { tone: "success", verdict: "Within target" };
  if (target.value <= target.watches) return { tone: "warning", verdict: "Watch" };
  return { tone: "danger", verdict: "Over target" };
}

function render(target: SlaTarget, value: number): string {
  return target.format === "rate" ? `${(value * 100).toFixed(1)}%` : `${value.toFixed(1)}h`;
}

export function ThroughputSlaRow({ targets }: { targets: readonly SlaTarget[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {targets.map((target) => {
        const { tone, verdict } = band(target);
        const classes = statusToneClasses(tone);
        return (
          <li key={target.label} className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-1.5 p-4")}>
            <div className="flex items-start justify-between gap-2">
              <span className={cn("font-medium text-muted-foreground", typeScaleClass("label"))}>
                {target.label}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5",
                  classes.surface,
                  classes.ink,
                  classes.rule,
                  typeScaleClass("micro"),
                )}
              >
                {verdict}
              </span>
            </div>
            <span className="font-mono text-lg font-semibold tabular-nums">
              {target.value === null ? "—" : render(target, target.value)}
            </span>
            <span className={cn("text-muted-foreground", typeScaleClass("dense"))}>
              {target.basis}
            </span>
            <span className={cn("text-muted-foreground", typeScaleClass("micro"))}>
              Target {render(target, target.meets)} or better · watch to{" "}
              {render(target, target.watches)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
