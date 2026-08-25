"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  DATA_QUALITY_CLASS_LABELS,
  type DatasetHealthTrend,
} from "@/types/crm/autonomy";

/**
 * The state of the data everything else on this card was decided against.
 *
 * Part of the scoreboard rather than a surface of its own, and that is the
 * argument for it existing at all: a correction rate and a dataset-health
 * penalty are usually two readings of one problem. An autonomous system working
 * from records that contradict each other gets corrected more often, and a
 * manager watching a correction rate climb needs to see, in the same glance,
 * whether the model or the data underneath it is the cause.
 */

/**
 * The composite is a penalty, so down is good and the arrow has to say so.
 *
 * `null` is not "unchanged" — it means nothing has been recorded to compare
 * against, and drawing a flat line for a tenant whose queue was switched on this
 * morning is the same reassuring lie this card refuses when it renders a null
 * correction rate as "—".
 */
const DIRECTION: Record<
  NonNullable<DatasetHealthTrend["direction"]>,
  { tone: StatusTone; Icon: typeof ArrowDownRight; verb: string }
> = {
  improving: { tone: "success", Icon: ArrowDownRight, verb: "better" },
  worsening: { tone: "danger", Icon: ArrowUpRight, verb: "worse" },
  unchanged: { tone: "neutral", Icon: Minus, verb: "unchanged" },
};

function DirectionBadge({ trend }: { trend: DatasetHealthTrend }) {
  if (trend.direction === null || trend.delta === null)
    return (
      <p className="text-micro text-muted-foreground">
        No earlier reading yet — this becomes a direction once there is a day to
        compare against.
      </p>
    );

  const { tone, Icon, verb } = DIRECTION[trend.direction];
  const classes = statusToneClasses(tone);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-micro font-medium",
        classes.surface,
        classes.inkStrong,
        classes.rule,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {trend.direction === "unchanged"
        ? `Unchanged over ${trend.windowDays} days`
        : `${Math.abs(trend.delta)} ${verb} over ${trend.windowDays} days`}
    </span>
  );
}

/**
 * A sparkline drawn from the recorded series.
 *
 * Inline SVG rather than a charting dependency: this is one polyline over at
 * most a year of daily points, and it has to read in both themes, which
 * `currentColor` gives for free. Fewer than two points is not a line — a single
 * dot implying a trend would be the graph making a claim the data cannot.
 */
function Sparkline({ trend }: { trend: DatasetHealthTrend }) {
  if (trend.series.length < 2) return null;

  const values = trend.series.map((point) => point.composite);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const span = highest - lowest || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      // Inverted, because the composite is a penalty: a falling line is progress
      // and it should read as one.
      const y = 24 - ((value - lowest) / span) * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      className="h-6 w-full text-muted-foreground"
      role="img"
      aria-label={`Dataset health over the last ${trend.windowDays} days, from ${values[0]} to ${values[values.length - 1]}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function DatasetHealthPanel({ trend }: { trend: DatasetHealthTrend }) {
  const { current } = trend;
  const clean = current.openTotal === 0;

  return (
    <section className="mt-4 flex flex-col gap-gap-toolbar border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-gap-field">
        <div className="min-w-0">
          <p className="text-sm font-medium">The data it is working from</p>
          <p className="text-micro text-muted-foreground">
            Everything open in the data-quality queue, weighted by how much harm
            it does. Lower is better.
          </p>
        </div>
        <DirectionBadge trend={trend} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums",
              clean ? statusToneClasses("success").ink : undefined,
            )}
          >
            {current.composite}
          </p>
          <p className="text-micro text-muted-foreground">
            {clean
              ? "Nothing open"
              : /*
                  The weighted number and the raw count both, because they mean
                  different things: 24 from three high-severity contradictions is
                  a different afternoon from 24 stale leads.
                */
                `${current.openTotal} open · ${current.bySeverity.high} high, ${current.bySeverity.medium} medium, ${current.bySeverity.low} low`}
          </p>
        </div>

        <div className="min-w-[120px] flex-1">
          <Sparkline trend={trend} />
        </div>
      </div>

      {current.byClass.length > 0 ? (
        /*
          Heaviest first, which is the order somebody would work them in — and
          the weights add up to the headline, so the breakdown explains the
          number rather than telling a second story about it.
        */
        <ul className="flex flex-col gap-gap-inline">
          {current.byClass.map((row) => (
            <li
              key={row.producer}
              className="flex items-baseline justify-between gap-gap-field text-dense"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {DATA_QUALITY_CLASS_LABELS[row.producer] ?? row.producer}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-medium">{row.weight}</span>
                <span className="text-muted-foreground"> from {row.count}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
