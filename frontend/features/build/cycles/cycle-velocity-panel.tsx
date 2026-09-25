"use client";

import { useVelocityReport } from "@/hooks/api/build/reports";
import { VelocityChart } from "@/features/build/reports/velocity-chart";
import { Skeleton } from "@/components/ui/skeleton";

export function CycleVelocityPanel({ projectId }: { projectId: number }) {
  const { data, isLoading, isError } = useVelocityReport(projectId);

  return (
    <section className="space-y-3" aria-labelledby="cycle-velocity-heading">
      <div>
        <h2 id="cycle-velocity-heading" className="text-sm font-semibold">Velocity</h2>
        <p className="text-xs text-muted-foreground">Committed and completed points across recent cycles.</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        {isLoading ? <Skeleton className="h-72 w-full" /> : null}
        {isError ? <p className="text-sm text-muted-foreground">Velocity is unavailable right now.</p> : null}
        {!isLoading && !isError && data?.length ? <VelocityChart data={data.map((cycle) => ({ name: cycle.name, Committed: cycle.committedPoints, Completed: cycle.completedPoints }))} /> : null}
        {!isLoading && !isError && !data?.length ? <p className="text-sm text-muted-foreground">Complete a cycle to see velocity here.</p> : null}
      </div>
    </section>
  );
}
