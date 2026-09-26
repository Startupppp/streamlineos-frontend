"use client";

import { useCallback } from "react";
import { useCustomStates } from "@/hooks/api/build/custom-states";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { TEXT_BODY, TEXT_ONE_LINE } from "@/lib/text-overflow";
import {
  TRANSITION_TABLE_HEADERS,
  TransitionsTable,
} from "./transitions-table";
import { WipRow } from "./wip-row";

const WIP_TABLE_HEADERS = ["Status", "WIP limit"] as const;

interface WorkflowPageProps {
  projectId: number;
}

export function WorkflowPage({ projectId }: WorkflowPageProps) {
  const canManage = useCan("build:workflow:manage");

  const {
    data: statuses,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomStates(projectId);

  const pageState = usePageState({
    permission: "build:workflow:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (statuses ?? []).length === 0,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Workflow"
      subtitle="Configure allowed status transitions and WIP limits."
    >
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <div className="flex min-h-0 flex-1 flex-col space-y-4">
              <DataTableSkeleton rows={12} headers={WIP_TABLE_HEADERS} className="flex-1" />
              <DataTableSkeleton
                rows={12}
                headers={TRANSITION_TABLE_HEADERS}
                className="flex-1"
              />
            </div>
          }
          empty={
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="projects"
              title="No statuses configured"
              description="Add custom statuses in project settings before setting up workflow transitions."
              action={{ label: "Go to Settings", href: `/build/${projectId}/settings` }}
            />
          }
          onRetry={handleRetry}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            <PmSection index={0}>
              <h2 className={`mb-1 text-sm font-semibold ${TEXT_ONE_LINE}`}>
                Statuses & WIP Limits
              </h2>
              <p className={`mb-3 text-xs text-muted-foreground ${TEXT_BODY}`}>
                WIP limit caps how many items can sit in this status. Leave empty for no limit.
              </p>
              <PmPanel solid>
                {(statuses ?? []).map((s) => (
                  <WipRow
                    key={s.id}
                    status={s}
                    projectId={projectId}
                    canManage={canManage}
                  />
                ))}
              </PmPanel>
            </PmSection>

            <PmSection index={1}>
              <PmPanel className="p-0" solid>
                <TransitionsTable projectId={projectId} statuses={statuses ?? []} />
              </PmPanel>
            </PmSection>
          </div>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
