"use client";

import { useState, useMemo, useCallback, Suspense, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import { MenuIcon, SlidersHorizontalIcon } from "@animateicons/react/lucide";
import {
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Check,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCan } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/projects/projects";
import {
  buildMoreGroups,
  buildPrimaryNav,
  filterVisibleNavGroups,
  filterVisibleNavItems,
  settingsNavItem,
  type ProjectNavItem,
  type ProjectNavPermissions,
} from "@/features/projects/sidebar/project-nav-config";
import { ProjectMoreMenu } from "@/features/projects/sidebar/project-more-menu";
import { ProjectNavCustomizeDialog } from "@/features/projects/sidebar/project-nav-customize-dialog";
import { useProjectNavVisibility } from "@/features/projects/sidebar/use-project-nav-visibility";

interface ProjectSidebarProps {
  projectId: string;
  projectName: string | undefined;
  projectKey: string | undefined;
  defaultCollapsed?: boolean;
}

function useProjectNavPermissions(): ProjectNavPermissions {
  return {
    canQA: useCan("projects:qa:view"),
    canBugs: useCan("projects:bugs:view"),
    canIncidents: useCan("projects:incidents:view"),
    canChangerequests: useCan("projects:changerequests:view"),
    canClientVisibility: useCan("projects:clientvisibility:manage"),
    canApprovals: useCan("projects:approvals:view"),
    canAI: useCan("projects:ai:use"),
    canForms: useCan("projects:forms:view"),
    canRisks: useCan("projects:risks:view"),
    canDecisions: useCan("projects:decisions:view"),
    canMeetings: useCan("projects:meetings:view"),
    canWorkflow: useCan("projects:workflow:view"),
    canChat: useCan("projects:tickets:view"),
    canFeedback: useCan("feedbucket:submissions:view"),
  };
}

function useIsActive(baseUrl: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string) => {
      if (!pathname) return false;
      if (href.includes("view=workload")) {
        return pathname === baseUrl && searchParams.get("view") === "workload";
      }
      if (href === baseUrl) {
        if (pathname !== baseUrl) return false;
        const view = searchParams.get("view");
        return !view || view === "board" || view === "list" || view === "table" || view === "calendar" || view === "gantt";
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname, searchParams, baseUrl],
  );
}

function getProjectInitials(key?: string, name?: string): string {
  if (key && key.length >= 2) return key.slice(0, 2).toUpperCase();
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return "PR";
}

function ProjectNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: ProjectNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...animatedNavHoverHandlers}
      className={cn(
        "group/nav relative flex items-center rounded-lg text-[13px] font-medium",
        "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
        collapsed ? "mx-auto justify-center p-1.5" : "px-2.5 py-1.5",
        active
          ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px] shadow-primary/15"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60" />
      ) : null}
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150",
          active ? "text-primary" : "group-hover/nav:scale-105",
          !collapsed && "mr-2",
        )}
      />
      {!collapsed ? <span className="truncate tracking-tight">{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function ProjectSwitcher({
  currentProjectId,
  currentProjectName,
}: {
  currentProjectId: string;
  currentProjectName: string | undefined;
  currentProjectKey?: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: projectsData } = useProjects({ limit: 100 });

  const filtered = useMemo(() => {
    const projects = projectsData?.data ?? [];
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    );
  }, [projectsData?.data, search]);

  const handleSelect = useCallback(
    (projectId: number) => {
      setOpen(false);
      setSearch("");
      const currentBase = `/projects/${currentProjectId}`;
      const subPath = pathname?.startsWith(currentBase)
        ? pathname.slice(currentBase.length)
        : "";
      const target = subPath
        ? `/projects/${projectId}${subPath}`
        : `/projects/${projectId}`;
      router.push(target);
    },
    [currentProjectId, pathname, router],
  );

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-0.5 text-sm font-semibold transition-colors hover:text-foreground/80"
          aria-label="Switch project"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate">{currentProjectName ?? "Project"}</span>
          <ChevronsUpDown className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" sideOffset={8}>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search projects…"
              className="h-7 pl-7 text-xs"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-64">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No projects found.
            </p>
          ) : (
            <div className="p-1" role="listbox" aria-label="Projects">
              {filtered.map((p) => {
                const isCurrent = String(p.id) === currentProjectId;
                const handleClick = () => handleSelect(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={handleClick}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      isCurrent
                        ? "bg-muted text-foreground"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                      {p.key.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
                    {isCurrent ? <Check className="h-3 w-3 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

const PROJECT_SIDEBAR_COOKIE = "project-sidebar-collapsed";

function DesktopSidebar({
  projectId,
  projectName,
  projectKey,
  defaultCollapsed = false,
}: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const baseUrl = `/projects/${projectId}`;
  const perms = useProjectNavPermissions();
  const primary = buildPrimaryNav(baseUrl, perms);
  const moreGroups = buildMoreGroups(baseUrl, perms);
  const settings = settingsNavItem(baseUrl);
  const isActive = useIsActive(baseUrl);
  const { hiddenIds, isVisible, setVisible, reset, hasCustomizations } =
    useProjectNavVisibility();

  const visiblePrimary = useMemo(
    () => filterVisibleNavItems(primary, hiddenIds),
    [primary, hiddenIds],
  );
  const visibleMoreGroups = useMemo(
    () => filterVisibleNavGroups(moreGroups, hiddenIds),
    [moreGroups, hiddenIds],
  );

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${PROJECT_SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }, []);

  const handleOpenCustomize = useCallback(() => {
    setCustomizeOpen(true);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border/60",
          "bg-gradient-to-b from-card/80 via-card/50 to-background/40 backdrop-blur-xl",
          "supports-[backdrop-filter]:bg-card/40",
          isCollapsed ? "w-[52px]" : "w-[228px]",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent"
        />
        <div
          className={cn(
            "relative shrink-0 border-b border-border/50",
            isCollapsed ? "p-1.5" : "px-2.5 py-3",
          )}
        >
          <div
            className={cn(
              "flex items-center",
              isCollapsed ? "flex-col gap-1.5" : "gap-2",
            )}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-[0_0_20px_-4px] shadow-primary/50 ring-1 ring-primary/30">
              {getProjectInitials(projectKey, projectName)}
            </div>
            {!isCollapsed ? (
              <ProjectSwitcher
                currentProjectId={projectId}
                currentProjectName={projectName}
                currentProjectKey={projectKey}
              />
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          {!isCollapsed && projectKey ? (
            <p className="mt-1.5 truncate px-0.5 font-mono text-[10px] tracking-wide text-muted-foreground/80">
              {projectKey}
            </p>
          ) : null}
        </div>

        <ScrollArea className="relative flex-1">
          <div className={cn("space-y-0.5 py-2.5", isCollapsed ? "px-1" : "px-1.5")}>
            {!isCollapsed ? (
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                Navigate
              </p>
            ) : null}
            {visiblePrimary.map((item) => (
              <ProjectNavLink
                key={item.id}
                item={item}
                active={isActive(item.href)}
                collapsed={isCollapsed}
              />
            ))}

            <div className={cn("pt-1.5", isCollapsed && "flex justify-center")}>
              <ProjectMoreMenu
                baseUrl={baseUrl}
                groups={visibleMoreGroups}
                collapsed={isCollapsed}
                onCustomize={handleOpenCustomize}
              />
            </div>
          </div>
        </ScrollArea>

        <div
          className={cn(
            "relative shrink-0 space-y-0.5 border-t border-border/50 bg-background/20 py-2 backdrop-blur-sm",
            isCollapsed ? "px-1" : "px-1.5",
          )}
        >
          <ProjectNavLink
            item={settings}
            active={isActive(settings.href)}
            collapsed={isCollapsed}
          />
        </div>
      </div>

      <ProjectNavCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        primary={primary}
        groups={moreGroups}
        isVisible={isVisible}
        setVisible={setVisible}
        reset={reset}
        hasCustomizations={hasCustomizations}
      />
    </TooltipProvider>
  );
}

function MobileProjectNav({
  projectId,
  projectName,
  projectKey,
}: ProjectSidebarProps) {
  const [open, setOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const baseUrl = `/projects/${projectId}`;
  const perms = useProjectNavPermissions();
  const primary = buildPrimaryNav(baseUrl, perms);
  const moreGroups = buildMoreGroups(baseUrl, perms);
  const settings = settingsNavItem(baseUrl);
  const isActive = useIsActive(baseUrl);
  const pathname = usePathname();
  const { hiddenIds, isVisible, setVisible, reset, hasCustomizations } =
    useProjectNavVisibility();

  const visiblePrimary = useMemo(
    () => filterVisibleNavItems(primary, hiddenIds),
    [primary, hiddenIds],
  );
  const visibleMoreGroups = useMemo(
    () => filterVisibleNavGroups(moreGroups, hiddenIds),
    [moreGroups, hiddenIds],
  );

  const current =
    primary.find((i) => isActive(i.href)) ??
    moreGroups.flatMap((g) => g.items).find((i) => isActive(i.href)) ??
    (isActive(settings.href) ? settings : undefined);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleOpenCustomize = useCallback(() => {
    setOpen(false);
    setCustomizeOpen(true);
  }, []);

  return (
    <div className="flex items-center gap-2 border-b border-border/80 bg-background px-3 py-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Open project menu"
          >
            <MenuIcon className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 gap-0 border-r border-border bg-background p-0 shadow-xl"
        >
          <SheetTitle className="sr-only">Project Navigation</SheetTitle>
          <div className="flex h-full flex-col bg-background">
            <div className="shrink-0 border-b border-border bg-background px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                  {getProjectInitials(projectKey, projectName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {projectName ?? "Project"}
                  </p>
                  {projectKey ? (
                    <p className="font-mono text-[10px] text-muted-foreground">{projectKey}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-background">
              <div className="space-y-0.5 px-1.5 py-2">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workspace
                </p>
                {visiblePrimary.map((item) => (
                  <ProjectNavLink
                    key={item.id}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={false}
                    onNavigate={handleClose}
                  />
                ))}
                {visibleMoreGroups.map((group) => (
                  <div key={group.id} className="pt-3">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </p>
                    {group.items.map((item) => (
                      <ProjectNavLink
                        key={item.id}
                        item={item}
                        active={isActive(item.href)}
                        collapsed={false}
                        onNavigate={handleClose}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="shrink-0 space-y-0.5 border-t border-border bg-background px-1.5 py-1.5">
              <button
                type="button"
                onClick={handleOpenCustomize}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <SlidersHorizontalIcon className="h-4 w-4 shrink-0" />
                <span>Customize sidebar</span>
              </button>
              <ProjectNavLink
                item={settings}
                active={isActive(settings.href)}
                collapsed={false}
                onNavigate={handleClose}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          href={baseUrl}
          className="shrink-0 font-semibold text-foreground"
        >
          {projectKey ?? "Project"}
        </Link>
        {current && pathname !== baseUrl ? (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="truncate text-muted-foreground">{current.label}</span>
          </>
        ) : null}
      </div>

      <ProjectNavCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        primary={primary}
        groups={moreGroups}
        isVisible={isVisible}
        setVisible={setVisible}
        reset={reset}
        hasCustomizations={hasCustomizations}
      />
    </div>
  );
}

function SidebarSuspenseFallback({
  defaultCollapsed,
}: {
  defaultCollapsed?: boolean;
}) {
  return (
    <div
      className={cn(
        "hidden h-full shrink-0 border-r border-border/80 bg-card/40 md:flex",
        defaultCollapsed ? "w-[52px]" : "w-[220px]",
      )}
    />
  );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  return (
    <>
      <div className="hidden h-full md:flex">
        <Suspense fallback={<SidebarSuspenseFallback defaultCollapsed={props.defaultCollapsed} />}>
          <DesktopSidebar {...props} />
        </Suspense>
      </div>
      <div className="md:hidden">
        <Suspense fallback={null}>
          <MobileProjectNav {...props} />
        </Suspense>
      </div>
    </>
  );
}
