"use client";

import dynamic from "next/dynamic";
import { useVelocityReport } from "@/hooks/api/build/reports";
import { Skeleton } from "@/components/ui/skeleton";

const VelocityChart = dynamic(
  () =>
    import("@/features/build/reports/velocity-chart").then((m) => ({
      default: m.VelocityChart,
    })),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> },
);

export function CycleVelocityPanel({ projectId }: { projectId: number }) {
  const { data, isLoading, isError } = useVelocityReport(projectId);
  const cycles = data ?? [];

  return (
    <section className="space-y-3" aria-labelledby="cycle-velocity-heading">
      <div>
        <h2 id="cycle-velocity-heading" className="text-sm font-medium">Velocity</h2>
        <p className="text-xs text-muted-foreground">Committed and completed points across recent cycles.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        {isLoading ? <Skeleton className="h-72 w-full" /> : null}
        {isError ? <p className="text-sm text-muted-foreground">Velocity is unavailable right now.</p> : null}
        {!isLoading && !isError && cycles.length > 0 ? <VelocityChart data={cycles.map((cycle) => ({ name: cycle.name, Committed: cycle.committedPoints, Completed: cycle.completedPoints }))} /> : null}
        {!isLoading && !isError && cycles.length === 0 ? <p className="text-sm text-muted-foreground">Complete a cycle to see velocity here.</p> : null}
      </div>
    </section>
  );
}
