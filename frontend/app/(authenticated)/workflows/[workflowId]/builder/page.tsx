"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const WorkflowBuilderGate = dynamic(
  () =>
    import("@/features/workflows/builder/workflow-builder-canvas").then(
      (m) => ({ default: m.WorkflowBuilderGate }),
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col gap-2 p-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-12 shrink-0 bg-card border-b border-border flex items-center px-3 gap-3">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex-1 bg-muted/30 animate-pulse" />
        </div>
      </div>
    ),
  },
);

export default function WorkflowBuilderPage() {
  const params = useParams<{ workflowId: string }>();
  return <WorkflowBuilderGate workflowId={params.workflowId} />;
}
