"use client";

import { motion, AnimatePresence, useReducedMotion, type MotionProps } from "framer-motion";
import { useCustomStates } from "@/hooks/api/projects/custom-states";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { TransitionsTable } from "./transitions-table";
import { WipRow } from "./wip-row";

interface WorkflowPageProps {
  projectId: number;
}

export function WorkflowPage({ projectId }: WorkflowPageProps) {
  const shouldReduce = useReducedMotion();
  const canManage = useCan("projects:workflow:manage");

  const {
    data: statuses,
    isLoading,
    isError,
    refetch,
  } = useCustomStates(projectId);

  const fadeUp: MotionProps = shouldReduce
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: "easeOut" },
      };

  const noStatuses = !isLoading && !isError && (statuses ?? []).length === 0;

  return (
    <PageWrapper
      title="Workflow"
      eyebrow="Project"
      subtitle="Configure allowed status transitions and WIP limits."
    >
      <div className="px-4 pb-6 space-y-6">
        {isLoading ? (
          <>
            <SkeletonTable rows={4} columns={2} />
            <SkeletonTable rows={5} columns={6} />
          </>
        ) : isError ? (
          <ErrorState className="flex-1" onRetry={() => void refetch()} />
        ) : noStatuses ? (
          <EmptyState
            illustrationPreset="projects"
            title="No statuses configured"
            description="Add custom statuses in project settings before setting up workflow transitions."
            action={{ label: "Go to Settings", href: `/projects/${projectId}/settings` }}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key="content" {...fadeUp} className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold mb-1">Statuses & WIP Limits</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  WIP limit caps how many items can sit in this status. Leave empty for no limit.
                </p>
                <div className="rounded-lg border bg-card">
                  {(statuses ?? []).map((s) => (
                    <WipRow
                      key={s.id}
                      status={s}
                      projectId={projectId}
                      canManage={canManage}
                    />
                  ))}
                </div>
              </section>

              <section>
                <TransitionsTable projectId={projectId} statuses={statuses ?? []} />
              </section>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageWrapper>
  );
}
