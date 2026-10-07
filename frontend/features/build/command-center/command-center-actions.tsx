"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import type { ProjectListItem } from "@/types/projects";
import {
  Briefcase,
  FolderPlus,
  ListPlus,
  Network,
  Target,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";

interface CreateIssueButtonProps {
  projects: ProjectListItem[];
  onCreateForProject: (projectId: number) => void;
  onCreateIssue?: () => void;
  className?: string;
}

export function CreateIssueButton({
  projects,
  onCreateForProject,
  onCreateIssue,
  className,
}: CreateIssueButtonProps) {
  const canCreate = useCan("build:tickets:create");

  const handleClick = useCallback(() => {
    if (onCreateIssue) {
      onCreateIssue();
      return;
    }
    const project = projects[0];
    if (project) onCreateForProject(project.id);
  }, [onCreateIssue, projects, onCreateForProject]);

  if (!canCreate || projects.length === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1 text-xs text-muted-foreground", className)}
      onClick={handleClick}
    >
      New issue
    </Button>
  );
}

interface QuickCreateMenuProps {
  className?: string;
  projects: ProjectListItem[];
  onCreateProject: () => void;
  onCreateForProject: (projectId: number) => void;
  onCreateIssue?: () => void;
}

const drawerItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted";

function QuickCreateDrawerLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof FolderPlus;
}) {
  return (
    <DrawerClose asChild>
      <Link href={href} className={drawerItemClass}>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {label}
      </Link>
    </DrawerClose>
  );
}

export function QuickCreateMenu({
  className,
  projects,
  onCreateProject,
  onCreateForProject,
  onCreateIssue,
}: QuickCreateMenuProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canCreateIssue = useCan("build:tickets:create");
  const canCreateProject = useCan("build:create");
  const canCreateTeam = useCan("build:teams:create");
  const canManagePortfolio = useCan("build:portfolios:manage");
  const canManageGoals = useCan("build:goals:manage");
  const hasProjects = projects.length > 0;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleCreateIssue = useCallback(() => {
    if (onCreateIssue) {
      onCreateIssue();
      return;
    }
    const project = projects[0];
    if (project) onCreateForProject(project.id);
  }, [onCreateIssue, projects, onCreateForProject]);

  const handleCreateProject = useCallback(() => {
    onCreateProject();
    setDrawerOpen(false);
  }, [onCreateProject]);

  const handleCreateIssueAndClose = useCallback(() => {
    handleCreateIssue();
    setDrawerOpen(false);
  }, [handleCreateIssue]);

  const showNewProject = canCreateProject;
  const showNewIssue = canCreateIssue && hasProjects;
  const showNewTeam = canCreateTeam;
  const showNewPortfolio = canManagePortfolio;
  const showNewGoal = canManageGoals;
  const hasCreateActions =
    showNewProject || showNewIssue || showNewTeam || showNewPortfolio || showNewGoal;

  if (!hasCreateActions) {
    return null;
  }

  const triggerButton = (
    <Button
      size="sm"
      className={cn("min-h-9 min-w-0 gap-1.5", className)}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} />
      New
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border bg-card p-0 shadow-2xl">
          <DrawerHeader className="shrink-0 px-4 pb-2 pt-1">
            <DrawerTitle className="text-sm font-medium text-foreground">
              Create
            </DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {showNewProject ? (
              <button
                type="button"
                onClick={handleCreateProject}
                className={drawerItemClass}
              >
                <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                New project
              </button>
            ) : null}
            {showNewIssue ? (
              <button
                type="button"
                onClick={handleCreateIssueAndClose}
                className={drawerItemClass}
              >
                <ListPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                New issue
              </button>
            ) : null}
            {showNewTeam ? (
              <QuickCreateDrawerLink
                href="/build/teams?create=1"
                label="New team"
                icon={Network}
              />
            ) : null}
            {showNewPortfolio ? (
              <QuickCreateDrawerLink
                href="/build/portfolios?create=1"
                label="New portfolio"
                icon={Briefcase}
              />
            ) : null}
            {showNewGoal ? (
              <QuickCreateDrawerLink
                href="/build/goals?create=1"
                label="New goal"
                icon={Target}
              />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Create
        </DropdownMenuLabel>
        {showNewProject ? (
          <DropdownMenuItem onClick={onCreateProject} className="cursor-pointer gap-2">
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
            <span>New project</span>
            <span className="ml-auto font-mono text-micro text-muted-foreground">C P</span>
          </DropdownMenuItem>
        ) : null}
        {showNewIssue ? (
          <DropdownMenuItem onClick={handleCreateIssue} className="cursor-pointer gap-2">
            <ListPlus className="h-4 w-4 text-muted-foreground" />
            <span>New issue</span>
            <span className="ml-auto font-mono text-micro text-muted-foreground">C T</span>
          </DropdownMenuItem>
        ) : null}
        {showNewTeam ? (
          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href="/build/teams?create=1">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span>New team</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showNewPortfolio ? (
          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href="/build/portfolios?create=1">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>New portfolio</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showNewGoal ? (
          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href="/build/goals?create=1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>New goal</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
