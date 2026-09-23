"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProjectListItem } from "@/types/projects";
import { PmSection, PmPanel, PmStaggerList } from "@/components/pm-chrome";
import { ProjectCard } from "./command-center-rows";
import { PanelHeader } from "./panel-header";
import {
  COMMAND_CENTER_LIST_PANEL,
  COMMAND_CENTER_PANEL_BODY_SCROLL,
} from "./command-center-constants";

interface ProjectsPanelProps {
  projects: ProjectListItem[];
  canCreateProject: boolean;
  canCreateIssue: boolean;
  onCreateProject: () => void;
  onCreateForProject: (projectId: number) => void;
}

export function ProjectsPanel({
  projects,
  canCreateProject,
  canCreateIssue,
  onCreateProject,
  onCreateForProject,
}: ProjectsPanelProps) {
  return (
    <PmSection
      index={3}
      className="flex min-h-0 min-w-0 w-full max-w-full flex-col lg:col-span-2"
    >
      <PmPanel className={COMMAND_CENTER_LIST_PANEL}>
        <PanelHeader
          title="Projects"
          actions={
            <>
              {canCreateProject ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground"
                  onClick={onCreateProject}
                >
                  New
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/build">
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </>
          }
        />
        <ScrollArea fill hideScrollbar className={COMMAND_CENTER_PANEL_BODY_SCROLL}>
          <div className="min-w-0 w-full max-w-full overscroll-contain p-1.5">
            {projects.length === 0 ? (
              <EmptyState
                illustrationPreset="projects"
                title="No projects yet"
                description="Create a project to start shipping."
                className="min-h-[12rem]"
                action={
                  canCreateProject
                    ? { label: "New project", onClick: onCreateProject }
                    : { label: "All projects", href: "/build" }
                }
              />
            ) : (
              <PmStaggerList className="flex flex-col gap-1">
                {projects.slice(0, 8).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onCreateIssue={canCreateIssue ? onCreateForProject : undefined}
                  />
                ))}
              </PmStaggerList>
            )}
          </div>
        </ScrollArea>
      </PmPanel>
    </PmSection>
  );
}
