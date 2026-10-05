"use client";

import React, { type UIEvent } from "react";
import { CommandCenterLayoutPanel } from "./command-center-layout-manager";
import { MyIssuesPanel } from "./command-center-my-issues-panel";
import { ProjectsPanel } from "./command-center-projects-panel";
import { ApprovalsPanel } from "./command-center-approvals-panel";
import { AgentRunsPanel } from "./command-center-agent-runs-panel";
import { RisksPanel } from "./command-center-risks-panel";
import { ReleasesPanel } from "./command-center-releases-panel";
import { BlockersPanel } from "./command-center-rows";
import { COMMAND_CENTER_PANELS_GRID } from "./command-center-constants";
import type { WidgetType } from "./dashboard-layout";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import type { EmptyAction } from "./command-center-utils";

interface CommandCenterWidgetGridProps {
  orderedWidgetTypes: WidgetType[];
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
  canViewApprovals: boolean;
  canViewRisks: boolean;
  canViewTickets: boolean;
  projectsError: boolean;
  projectsRawError: Error | null;
  onMyIssuesRetry: () => void;
  onMyIssuesScroll: (e: UIEvent<HTMLDivElement>) => void;
  onCreateIssue: () => void;
  onCreateForProject: (id: number) => void;
  onCreateProject: () => void;
  onRetryProjects: () => void;
  onReorderWidget: (from: number, to: number) => void;
  onRemoveWidget: (type: WidgetType) => void;
}

export function CommandCenterWidgetGrid({
  orderedWidgetTypes,
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
  canViewApprovals,
  canViewRisks,
  canViewTickets,
  projectsError,
  projectsRawError,
  onMyIssuesRetry,
  onMyIssuesScroll,
  onCreateIssue,
  onCreateForProject,
  onCreateProject,
  onRetryProjects,
  onReorderWidget,
  onRemoveWidget,
}: CommandCenterWidgetGridProps) {
  return (
    <div className={COMMAND_CENTER_PANELS_GRID}>
      {orderedWidgetTypes.map((type, i) => {
        let panel: React.ReactNode = null;
        if (type === "my-issues") {
          panel = (
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
          );
        } else if (type === "projects") {
          panel = (
            <ProjectsPanel
              projects={projects}
              canCreateProject={canCreateProject}
              canCreateIssue={canCreateIssue}
              isError={projectsError}
              error={projectsRawError}
              onCreateProject={onCreateProject}
              onCreateForProject={onCreateForProject}
              onRetry={onRetryProjects}
            />
          );
        } else if (type === "approvals" && canViewApprovals) {
          panel = <ApprovalsPanel />;
        } else if (type === "agent-runs" && canViewTickets) {
          panel = <AgentRunsPanel />;
        } else if (type === "risks" && canViewRisks) {
          panel = <RisksPanel />;
        } else if (type === "releases") {
          panel = <ReleasesPanel />;
        } else if (type === "blockers" && canViewTickets) {
          panel = <BlockersPanel />;
        }
        if (!panel) return null;
        return (
          <CommandCenterLayoutPanel
            key={type}
            widgetType={type}
            index={i}
            total={orderedWidgetTypes.length}
            onMoveUp={() => onReorderWidget(i, i - 1)}
            onMoveDown={() => onReorderWidget(i, i + 1)}
            onRemove={() => onRemoveWidget(type)}
          >
            {panel}
          </CommandCenterLayoutPanel>
        );
      })}
    </div>
  );
}
