"use client";

import { useCallback } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import type { ProjectListItem } from "@/types/projects";
import { Briefcase, CircleCheck, FolderPlus, ListPlus } from "lucide-react";
import {
  LayoutGridIcon,
  LayoutListIcon,
  LayersIcon,
  PlusIcon,
  RocketIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import {
  listContainer,
  listItem,
  listItemReduced,
  pmSpring,
} from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

type IconRef = RefObject<IconHandle | null>;

const shellClass = cn(
  "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2.5 py-1",
  "text-xs text-muted-foreground shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-card/40",
  "transition-[border-color,background-color,box-shadow,color] duration-150",
  "hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground hover:shadow-md",
);

function PinnedChip({
  label,
  href,
  index,
  renderIcon,
}: {
  label: string;
  href: string;
  index: number;
  renderIcon: (ref: IconRef) => ReactNode;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      custom={index}
      whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.03 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={pmSpring}
    >
      <Link href={href} className={shellClass} {...hoverHandlers}>
        <span className="shrink-0">{renderIcon(iconRef)}</span>
        <span className={TEXT_ONE_LINE}>{label}</span>
      </Link>
    </motion.div>
  );
}

function renderMyIssuesIcon(ref: IconRef) {
  return <LayoutListIcon ref={ref} size={13} />;
}

function renderProjectsIcon(ref: IconRef) {
  return <LayersIcon ref={ref} size={13} />;
}

function renderInboxIcon(ref: IconRef) {
  return <LayoutGridIcon ref={ref} size={13} />;
}

function renderRoadmapIcon(ref: IconRef) {
  return <RocketIcon ref={ref} size={13} />;
}

const PINNED_LINKS: Array<{
  label: string;
  href: string;
  renderIcon: (ref: IconRef) => ReactNode;
}> = [
  {
    label: "My issues",
    href: "/projects/my-work",
    renderIcon: renderMyIssuesIcon,
  },
  {
    label: "Projects",
    href: "/projects/all",
    renderIcon: renderProjectsIcon,
  },
  {
    label: "Inbox",
    href: "/projects/all-work",
    renderIcon: renderInboxIcon,
  },
  {
    label: "Roadmap",
    href: "/projects/roadmap",
    renderIcon: renderRoadmapIcon,
  },
];

export function PinnedNav() {
  return (
    <motion.div
      className="flex flex-wrap items-center gap-1.5"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {PINNED_LINKS.map((link, index) => (
        <PinnedChip
          key={link.href}
          label={link.label}
          href={link.href}
          index={index}
          renderIcon={link.renderIcon}
        />
      ))}
    </motion.div>
  );
}

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
  const canCreate = useCan("projects:tickets:create");

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
  projects: ProjectListItem[];
  onCreateProject: () => void;
  onCreateForProject: (projectId: number) => void;
  onCreateIssue?: () => void;
}

export function QuickCreateMenu({
  projects,
  onCreateProject,
  onCreateForProject,
  onCreateIssue,
}: QuickCreateMenuProps) {
  const canCreateIssue = useCan("projects:tickets:create");
  const canCreateProject = useCan("projects:create");
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

  if (!canCreateProject && !(canCreateIssue && hasProjects)) {
    return (
      <Button size="sm" variant="outline" className="min-w-0 flex-1 gap-1.5 sm:flex-none" asChild>
        <Link href="/projects/all">All projects</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="min-w-0 flex-1 gap-1.5 sm:flex-none" {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canCreateProject ? (
          <DropdownMenuItem onClick={onCreateProject} className="cursor-pointer gap-2">
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
            <span>New project</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">C P</span>
          </DropdownMenuItem>
        ) : null}
        {canCreateIssue && hasProjects ? (
          <>
            {canCreateProject ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              onClick={handleCreateIssue}
              className="cursor-pointer gap-2"
            >
              <ListPlus className="h-4 w-4 text-muted-foreground" />
              <span>New issue</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">C T</span>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/projects/approvals">
            <CircleCheck className="h-4 w-4 text-muted-foreground" />
            <span>Approvals</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/projects/all">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>All projects</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
