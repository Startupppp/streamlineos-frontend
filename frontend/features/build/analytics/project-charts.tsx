"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StateChartRow,
  PriorityChartRow,
  VolumeChartRow,
  AssigneeChartRow,
  VelocityChartRow,
  EstimateChartRow,
} from "./project-charts-impl";

export type {
  StateChartRow,
  PriorityChartRow,
  VolumeChartRow,
  AssigneeChartRow,
  VelocityChartRow,
  EstimateChartRow,
};
export { STATE_COLORS, PRIORITY_COLORS } from "./project-stats";

const chartFallback = () => <Skeleton className="h-[220px] w-full rounded-lg" />;

export const StateDistributionChart = dynamic<{ data: StateChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.StateDistributionChart,
    })),
  { ssr: false, loading: chartFallback },
);

export const PriorityBreakdownChart = dynamic<{ data: PriorityChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.PriorityBreakdownChart,
    })),
  { ssr: false, loading: chartFallback },
);

export const VolumeOverTimeChart = dynamic<{ data: VolumeChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.VolumeOverTimeChart,
    })),
  { ssr: false, loading: chartFallback },
);

export const AssigneeCompletionChart = dynamic<{ data: AssigneeChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.AssigneeCompletionChart,
    })),
  { ssr: false, loading: chartFallback },
);

export const CycleVelocityChart = dynamic<{ data: VelocityChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.CycleVelocityChart,
    })),
  { ssr: false, loading: chartFallback },
);

export const EstimateVsActualChart = dynamic<{ data: EstimateChartRow[] }>(
  () =>
    import("./project-charts-impl").then((m) => ({
      default: m.EstimateVsActualChart,
    })),
  { ssr: false, loading: chartFallback },
);
