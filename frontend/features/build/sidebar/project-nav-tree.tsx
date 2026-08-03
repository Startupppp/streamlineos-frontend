"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";
import { isApiError } from "@/lib/api-client";
import { useProject } from "@/hooks/api/build/projects";
import {
  buildProjectNavGroups,
  filterHiddenNavGroups,
  filterVisibleNavGroups,
  settingsNavItem,
  type ProjectNavItem,
} from "./project-nav-config";
import { ProjectMoreMenu } from "./project-more-menu";
import { ProjectNavCustomizeDialog } from "./project-nav-customize-dialog";
import { ProjectNavSection } from "./project-nav-section";
import { ProjectSwitcher } from "./project-switcher";
import {
  useProjectNavIsActive,
  useProjectNavPermissions,
} from "./use-project-nav";
import { useProjectNavVisibility } from "./use-project-nav-visibility";

interface ProjectNavTreeProps {
  projectId: string;
  collapsed: boolean;
  accent: ModuleAccent;
  onNavigate?: () => void;
}

function ProjectTreeLink({
  item,
  active,
  collapsed,
  accent,
  onNavigate,
}: {
  item: ProjectNavItem;
  active: boolean;
  collapsed: boolean;
  accent: ModuleAccent;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "nav-item group relative flex gap-2.5",
        collapsed ? "mx-auto h-8 w-8 justify-center" : "py-1.5 pr-2",
        active && "active",
      )}
      style={collapsed ? undefined : { paddingLeft: "1.375rem" }}
    >
      {active && !collapsed ? (
        <span
          aria-hidden
          className={cn(
            "absolute left-1.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full",
            accent.indicator,
          )}
        />
      ) : null}
      <Icon
        className={cn("nav-icon h-3.5 w-3.5 shrink-0", active && accent.text)}
      />
      {!collapsed ? (
        <TruncatedText
          text={item.label}
          className={cn(
            "flex-1 text-[0.8125rem]",
            active && "text-sidebar-foreground",
          )}
        />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={10}
        className="text-xs font-medium"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProjectNavTree({
  projectId,
  collapsed,
  accent,
  onNavigate,
}: ProjectNavTreeProps) {
  const baseUrl = `/build/${projectId}`;
  const perms = useProjectNavPermissions();
  const isActive = useProjectNavIsActive(baseUrl);
  const { hiddenIds, isVisible, setVisible, reset, hasCustomizations } =
    useProjectNavVisibility();
  const { data: project, isError, error } = useProject(Number(projectId));
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const handleOpenCustomize = useCallback(() => setCustomizeOpen(true), []);

  const allGroups = buildProjectNavGroups(baseUrl, perms);
  const inaccessible =
    isError &&
    isApiError(error) &&
    (error.status === 403 || error.status === 404);
  if (inaccessible || allGroups.length === 0) return null;

  const visibleGroups = filterVisibleNavGroups(allGroups, hiddenIds);
  const overflowGroups = filterHiddenNavGroups(allGroups, hiddenIds);
  const settings = settingsNavItem(baseUrl, perms.canSettings);

  const renderItem = (item: ProjectNavItem): ReactNode => (
    <ProjectTreeLink
      key={item.id}
      item={item}
      active={isActive(item.href)}
      collapsed={collapsed}
      accent={accent}
      onNavigate={onNavigate}
    />
  );

  const customizeDialog = (
    <ProjectNavCustomizeDialog
      open={customizeOpen}
      onOpenChange={setCustomizeOpen}
      groups={allGroups}
      isVisible={isVisible}
      setVisible={setVisible}
      reset={reset}
      hasCustomizations={hasCustomizations}
    />
  );

  if (collapsed) {
    return (
      <div className="mt-1 space-y-0.5 border-t border-sidebar-border/60 pt-1">
        {visibleGroups.flatMap((group) => group.items).map(renderItem)}
        <div className="flex justify-center">
          <ProjectMoreMenu
            baseUrl={baseUrl}
            groups={overflowGroups}
            collapsed
            onNavigate={onNavigate}
            onCustomize={handleOpenCustomize}
          />
        </div>
        {settings ? renderItem(settings) : null}
        {customizeDialog}
      </div>
    );
  }

  return (
    <div className="mb-1 mt-0.5 pl-2.5">
      <div className="space-y-1.5 border-l border-sidebar-border/70 pl-1.5">
        <div className="pr-1">
          <ProjectSwitcher
            currentProjectId={projectId}
            currentProjectName={project?.name}
            currentProjectKey={project?.key}
          />
        </div>
        {visibleGroups.map((group) => (
          <ProjectNavSection
            key={group.id}
            group={group}
            collapsed={false}
            hasActiveChild={group.items.some((item) => isActive(item.href))}
            renderItem={renderItem}
          />
        ))}
        <ProjectMoreMenu
          baseUrl={baseUrl}
          groups={overflowGroups}
          collapsed={false}
          onNavigate={onNavigate}
          onCustomize={handleOpenCustomize}
        />
        {settings ? renderItem(settings) : null}
      </div>

      {customizeDialog}
    </div>
  );
}
