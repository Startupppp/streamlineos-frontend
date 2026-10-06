"use client";

import { use } from "react";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { WorkloadView } from "@/features/build/views/workload-view";
import { WorkloadFilterBar } from "@/features/build/views/workload-filter-bar";
import { ViewSwitcher } from "@/features/build/views/view-switcher";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectLoadFallback } from "@/features/build/shared/project-load-fallback";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { notFound } from "next/navigation";
import { useWorkloadBoardPage } from "./use-workload-board-page";

const GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "team", label: "Group by team" },
] as const;

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export function WorkloadBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);

  const {
    data,
    projectLoading,
    projectError,
    projectErrorValue,
    allTickets,
    members,
    statuses,
    capacityByMemberId,
    teams,
    createParamOpen,
    shortcutHelpOpen,
    workloadFilters,
    group,
    focusedMemberId,
    handleWorkloadFilterChange,
    handleClearWorkloadFilters,
    handleGroupChange,
    handleCreateOpenChange,
    handleViewChange,
    handleRetryProject,
    handleShortcutHelpOpenChange,
    isOnline,
    resolution,
  } = useWorkloadBoardPage(projectId);

  if (projectLoading) {
    return (
      <PageWrapper title={<Skeleton className="h-5 w-40" />} noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (resolution.kind !== "ready" && resolution.kind !== "error") {
    return (
      <PageWrapper title="Workload" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (projectError) {
    return (
      <ProjectLoadFallback
        title="Workload"
        error={projectErrorValue}
        onRetry={handleRetryProject}
      />
    );
  }

  if (resolution.kind !== "ready") {
    return (
      <PageWrapper title="Workload" noInternalScroll>
        <PageState resolution={resolution} loading={<KanbanBoardSkeleton />}>
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  const filterLeading = (
    <div className="flex min-w-0 shrink-0 items-center gap-1">
      <ViewSwitcher activeView="workload" onViewChange={handleViewChange} />
      <BuildFilterSelect
        label="Group members by"
        value={group}
        onValueChange={handleGroupChange}
        options={GROUP_OPTIONS}
      />
    </div>
  );

  return (
    <PageWrapper
      title={data.name}
      subtitle={data.description ?? undefined}
      noInternalScroll
      filtersClassName="!gap-1 !px-3 sm:!gap-1.5 sm:!px-4 lg:!px-6"
      contentClassName="!p-0 flex min-h-0 min-w-0 flex-col overflow-hidden"
      className="relative"
      actions={
        <CreateTicketDialog
          projectId={projectId}
          externalOpen={createParamOpen}
          onExternalOpenChange={handleCreateOpenChange}
        />
      }
      filters={
        <WorkloadFilterBar
          className="w-full"
          leading={filterLeading}
          projectId={projectId}
          filters={workloadFilters}
          members={members}
          teams={teams}
          projectStatuses={statuses}
          onFilterChange={handleWorkloadFilterChange}
          onClearFilters={handleClearWorkloadFilters}
        />
      }
    >
      {!isOnline ? (
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="team"
          title="You are offline"
          description="Showing cached data. Reconnect to see the latest workload."
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-0 px-4 lg:px-6">
          <WorkloadView
            tickets={allTickets}
            projectId={projectId}
            projectKey={data.key}
            projectStatuses={statuses}
            members={members}
            filters={workloadFilters}
            onFilterChange={handleWorkloadFilterChange}
            onClearFilters={handleClearWorkloadFilters}
            capacityByMemberId={capacityByMemberId}
            focusedMemberId={focusedMemberId}
            group={group}
          />
        </div>
      )}
      <ShortcutHelpDialog
        open={shortcutHelpOpen}
        onOpenChange={handleShortcutHelpOpenChange}
      />
    </PageWrapper>
  );
}
