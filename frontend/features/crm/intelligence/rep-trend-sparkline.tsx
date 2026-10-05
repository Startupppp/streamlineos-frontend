"use client";

import { useMemo } from "react";
import type { RepTrendPoint } from "@/types/crm/call-intelligence";
import { METRIC_UNKNOWN, formatBpsPercent } from "./call-metric-format";

interface RepTrendSparklineProps {
  points: RepTrendPoint[];
  /** Which of the three per-bucket figures to draw. */
  metric: "talkRatio" | "questionRate" | "nextStep";
  bucket: "day" | "week";
  /** For the accessible label: whose trend this is. */
  repLabel: string;
}

const METRIC_LABEL: Record<RepTrendSparklineProps["metric"], string> = {
  talkRatio: "median talk ratio",
  questionRate: "median question rate",
  nextStep: "next-step capture",
};

interface SparklinePathData {
  segments: string;
  first: number;
  last: number;
}

function computeSparklinePath(
  points: RepTrendPoint[],
  metric: RepTrendSparklineProps["metric"],
): SparklinePathData | null {
  const values = points.map((point) => valueFor(point, metric));
  const present = values.filter((value): value is number => value !== null);
  if (present.length < 2) return null;

  const low = Math.min(...present);
  const high = Math.max(...present);
  const span = high - low || 1;
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;

  const pathParts: string[] = [];
  let open = false;
  values.forEach((value, index) => {
    if (value === null) {
      open = false;
      return;
    }
    const x = index * step;
    const y = 24 - ((value - low) / span) * 20 - 2;
    pathParts.push(`${open ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
    open = true;
  });

  return {
    segments: pathParts.join(" "),
    first: present[0],
    last: present[present.length - 1],
  };
}

/**
 * One rep's metric across the window, drawn small enough to sit in a table cell.
 *
 * Inline SVG rather than a charting library, deliberately. The whole series is
 * at most fourteen points — the server bounds it, see `trendBucketFor` — so a
 * library would add a client bundle and a render pass to draw thirteen line
 * segments. It also gives the empty case somewhere honest to go: a bucket with
 * no calls has a null median, and this draws a gap rather than joining the line
 * through it, because a straight line across a quiet fortnight is a claim that
 * nothing changed rather than that nothing happened.
 *
 * The `viewBox` is unitless and the element stretches, so the same component
 * works in a dense table cell and in a wider panel without a hardcoded height —
 * which is also why there is no `h-*` on the svg itself; the caller's cell owns
 * the box.
 *
 * A sparkline is decoration to a screen reader, so the whole thing carries one
 * `role="img"` and a label that states the range in words. Reading out fourteen
 * unlabelled coordinates would be worse than reading nothing.
 */
export function RepTrendSparkline({
  points,
  metric,
  bucket,
  repLabel,
}: RepTrendSparklineProps) {
  const pathData = useMemo(() => computeSparklinePath(points, metric), [points, metric]);

  if (!pathData)
    return (
      <span className="text-sm text-muted-foreground" aria-label={`Not enough points to chart ${METRIC_LABEL[metric]}`}>
        {METRIC_UNKNOWN}
      </span>
    );

  const { segments, first, last } = pathData;

  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      className="h-6 w-full min-w-16"
      role="img"
      aria-label={`${repLabel}: ${METRIC_LABEL[metric]} by ${bucket}, from ${describe(first, metric)} to ${describe(last, metric)}`}
    >
      <path
        d={segments}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="text-primary"
      />
    </svg>
  );
}

function valueFor(
  point: RepTrendPoint,
  metric: RepTrendSparklineProps["metric"],
): number | null {
  if (metric === "talkRatio") return point.medianTalkRatioBps;
  if (metric === "questionRate") return point.medianQuestionRateBps;
  return point.nextStepCommittedBps;
}

function describe(bps: number, metric: RepTrendSparklineProps["metric"]): string {
  if (metric === "questionRate") return `${(bps / 1000).toFixed(1)} questions per ten turns`;
  return formatBpsPercent(bps);
}
