"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
import { useAccess, useCan } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { ProjectListItem } from "@/types/projects";
import {
  Briefcase,
  FolderPlus,
  ListPlus,
  Network,
  Target,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import { matchesOrgModule } from "@/lib/module-vocabulary";
import {
  COMMAND_CENTER_JUMP_LINKS,
  type CommandCenterJumpLink,
} from "./command-center-jump-links";
import {
  listContainer,
  listItem,
  listItemReduced,
  pmSpring,
} from "@/features/build/shared/pm-motion";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";

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
      className="shrink-0"
    >
      <Link href={href} className={shellClass} {...hoverHandlers}>
        <span className="shrink-0">{renderIcon(iconRef)}</span>
        <span className={TEXT_ONE_LINE}>{label}</span>
      </Link>
    </motion.div>
  );
}

function isOrgModuleEnabled(
  enabledModules: string[],
  moduleKey: string | undefined,
): boolean {
  if (!moduleKey) return true;
  if (enabledModules.length === 0) return true;
  return matchesOrgModule(enabledModules, moduleKey);
}

function hasJumpLinkPermission(
  link: CommandCenterJumpLink,
  can: (permission: PermissionKey) => boolean,
): boolean {
  if (link.permissions.length === 0) return true;
  if (link.permissionMode === "all") {
    return link.permissions.every((permission) => can(permission));
  }
  return link.permissions.some((permission) => can(permission));
}

function isJumpLinkVisible(
  link: CommandCenterJumpLink,
  can: (permission: PermissionKey) => boolean,
  enabledModules: string[],
  accessModules: Record<string, boolean> | undefined,
  defaultProjectId: number | null,
): boolean {
  if (!isOrgModuleEnabled(enabledModules, link.enabledModule)) return false;
  if (
    link.accessModuleKey &&
    accessModules?.[link.accessModuleKey] === false
  ) {
    return false;
  }
  if (link.scope === "project" && defaultProjectId === null) return false;
  return hasJumpLinkPermission(link, can);
}

interface PinnedNavProps {
  defaultProjectId?: number | null;
}

export function PinnedNav({ defaultProjectId = null }: PinnedNavProps) {
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();

  const can = useCallback(
    (permission: PermissionKey): boolean => {
      if (!access) return false;
      if (access.isOrgOwner) return true;
      return access.permissions.includes(permission);
    },
    [access],
  );

  const visibleLinks = COMMAND_CENTER_JUMP_LINKS.filter((link) =>
    isJumpLinkVisible(
      link,
      can,
      enabledModules,
      access?.modules,
      defaultProjectId,
    ),
  );

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden">
      <motion.div
        className="flex w-0 min-w-full max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x [&>*]:shrink-0"
        variants={listContainer}
        initial="hidden"
        animate="show"
      >
        {visibleLinks.map((link, index) => (
          <PinnedChip
            key={link.id}
            label={link.label}
            href={link.buildHref(defaultProjectId)}
            index={index}
            renderIcon={link.renderIcon}
          />
        ))}
      </motion.div>
    </div>
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
    <Button size="sm" className="min-h-9 min-w-0 gap-1.5" {...hoverHandlers}>
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
            <DrawerTitle className="text-sm font-semibold text-foreground">
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
                href="/build/goal?create=1"
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
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Create
        </DropdownMenuLabel>
        {showNewProject ? (
          <DropdownMenuItem onClick={onCreateProject} className="cursor-pointer gap-2">
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
            <span>New project</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">C P</span>
          </DropdownMenuItem>
        ) : null}
        {showNewIssue ? (
          <DropdownMenuItem onClick={handleCreateIssue} className="cursor-pointer gap-2">
            <ListPlus className="h-4 w-4 text-muted-foreground" />
            <span>New issue</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">C T</span>
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
            <Link href="/build/goal?create=1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>New goal</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
