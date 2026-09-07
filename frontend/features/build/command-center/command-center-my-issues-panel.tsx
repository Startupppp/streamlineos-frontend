"use client";

import type { UIEvent } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import type { MyWorkItem } from "@/types/projects/my-work";
import type { ProjectListItem } from "@/types/projects";
import { PmSection, PmPanel, PmStaggerList } from "@/components/pm-chrome";
import { MyWorkRow } from "./command-center-rows";
import { CreateIssueButton } from "./command-center-actions";
import { PanelHeader } from "./panel-header";
import type { EmptyAction } from "./command-center-utils";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

interface MyIssuesPanelProps {
  items: MyWorkItem[];
  projects: ProjectListItem[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  emptyActions: { action: EmptyAction; secondaryAction?: EmptyAction };
  onRetry: () => void;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onCreateIssue: () => void;
  onCreateForProject: (projectId: number) => void;
}

export function MyIssuesPanel({
  items,
  projects,
  isLoading,
  isError,
  isFetchingNextPage,
  emptyActions,
  onRetry,
  onScroll,
  onCreateIssue,
  onCreateForProject,
}: MyIssuesPanelProps) {
  return (
    <PmSection
      index={2}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-3"
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="My issues"
          actions={
            <>
              <CreateIssueButton
                projects={projects}
                onCreateForProject={onCreateForProject}
                onCreateIssue={onCreateIssue}
              />
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/build/my-work">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </>
          }
        />
        {isLoading ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 shrink-0 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            className="min-h-[12rem] flex-1"
            title="Failed to load your issues"
            description="Could not fetch tickets. Please try again."
            onRetry={onRetry}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustrationPreset="projects"
            title="Inbox zero"
            description={
              projects.length === 0
                ? "Create a project to start tracking issues."
                : "No open issues assigned to you. Create one or open the board."
            }
            className="min-h-[12rem] flex-1"
            action={emptyActions.action}
            secondaryAction={emptyActions.secondaryAction}
          />
        ) : (
          <ScrollArea
            fill
            hideScrollbar
            className={COMMAND_CENTER_PANEL_BODY_SCROLL}
            onViewportScroll={onScroll}
          >
            <div className="min-w-0 w-full max-w-full overscroll-contain">
              <PmStaggerList>
                {items.map((item) => (
                  <MyWorkRow key={item.id} item={item} />
                ))}
              </PmStaggerList>
              {isFetchingNextPage ? (
                <div className="flex justify-center py-3">
                  <Loader2
                    className="h-4 w-4 animate-spin text-muted-foreground"
                    aria-label="Loading more issues"
                  />
                </div>
              ) : null}
            </div>
          </ScrollArea>
        )}
      </PmPanel>
    </PmSection>
  );
}
