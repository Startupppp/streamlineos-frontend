"use client";

import { useCallback, useMemo, type ReactNode, type UIEvent } from "react";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { MyIssuesPanel } from "./command-center-my-issues-panel";
import { ProjectsPanel } from "./command-center-projects-panel";
import { ApprovalsPanel } from "./command-center-approvals-panel";
import { AgentRunsPanel } from "./command-center-agent-runs-panel";
import { RisksPanel } from "./command-center-risks-panel";
import { ReleasesPanel } from "./command-center-releases-panel";
import { BlockersPanel } from "./command-center-blockers-panel";
import { OverviewWidget } from "./command-center-summary-widgets";
import type { WidgetType } from "./dashboard-layout";
import type { EmptyAction } from "./command-center-utils";

interface CommandCenterWidgetInputs {
  stats: { activeProjects: string | number; openIssues: number; overdueIssues: number };
  myWorkItems: MyWorkItem[];
  projects: ProjectListItem[];
  myIssuesLoading: boolean;
  myIssuesError: boolean;
  myIssuesRawError: Error | null;
  isFetchingNextPage: boolean;
  myIssuesEmpty: { action: EmptyAction; secondaryAction?: EmptyAction };
  focusedIndex: number | null;
  canCreateIssue: boolean;
  canCreateProject: boolean;
  projectsError: boolean;
  projectsRawError: Error | null;
  onMyIssuesRetry: () => void;
  onMyIssuesScroll: (e: UIEvent<HTMLDivElement>) => void;
  onCreateIssue: () => void;
  onCreateForProject: (projectId: number) => void;
  onCreateProject: () => void;
  onRetryProjects: () => unknown;
}

export function useCommandCenterWidgets({
  stats,
  myWorkItems,
  projects,
  myIssuesLoading,
  myIssuesError,
  myIssuesRawError,
  isFetchingNextPage,
  myIssuesEmpty,
  focusedIndex,
  canCreateIssue,
  canCreateProject,
  projectsError,
  projectsRawError,
  onMyIssuesRetry,
  onMyIssuesScroll,
  onCreateIssue,
  onCreateForProject,
  onCreateProject,
  onRetryProjects,
}: CommandCenterWidgetInputs): Partial<Record<WidgetType, ReactNode>> {
  const handleRetryProjects = useCallback(() => void onRetryProjects(), [onRetryProjects]);

  const myIssues = useMemo(
    () => (
      <MyIssuesPanel
        items={myWorkItems}
        projects={projects}
        isLoading={myIssuesLoading}
        isError={myIssuesError}
        error={myIssuesRawError}
        isFetchingNextPage={isFetchingNextPage}
        emptyActions={myIssuesEmpty}
        focusedIndex={focusedIndex}
        onRetry={onMyIssuesRetry}
        onScroll={onMyIssuesScroll}
        onCreateIssue={onCreateIssue}
        onCreateForProject={onCreateForProject}
      />
    ),
    [
      myWorkItems,
      projects,
      myIssuesLoading,
      myIssuesError,
      myIssuesRawError,
      isFetchingNextPage,
      myIssuesEmpty,
      focusedIndex,
      onMyIssuesRetry,
      onMyIssuesScroll,
      onCreateIssue,
      onCreateForProject,
    ],
  );

  const projectList = useMemo(
    () => (
      <ProjectsPanel
        projects={projects}
        canCreateProject={canCreateProject}
        canCreateIssue={canCreateIssue}
        isError={projectsError}
        error={projectsRawError}
        onCreateProject={onCreateProject}
        onCreateForProject={onCreateForProject}
        onRetry={handleRetryProjects}
      />
    ),
    [projects, canCreateProject, canCreateIssue, projectsError, projectsRawError, onCreateProject, onCreateForProject, handleRetryProjects],
  );

  return useMemo(
    () => ({
      overview: (
        <OverviewWidget
          activeProjects={stats.activeProjects}
          openIssues={stats.openIssues}
          overdueIssues={stats.overdueIssues}
        />
      ),
      "my-issues": myIssues,
      projects: projectList,
      approvals: <ApprovalsPanel />,
      "agent-runs": <AgentRunsPanel />,
      risks: <RisksPanel />,
      releases: <ReleasesPanel />,
      blockers: <BlockersPanel />,
    }),
    [stats.activeProjects, stats.openIssues, stats.overdueIssues, myIssues, projectList],
  );
}
