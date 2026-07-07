"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  ActivityIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  CircleCheckIcon,
  ClipboardIcon,
  GitBranchIcon,
  GlobeIcon,
  IndianRupeeIcon,
  LayersIcon,
  LayoutGridIcon,
  LayoutListIcon,
  MenuIcon,
  MessageCircleIcon,
  PackageOpenIcon,
  RocketIcon,
  SettingsIcon,
  ShieldXIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
  WebhookIcon,
  ZapIcon,
} from "@animateicons/react/lucide";
import {
  Calendar,
  CalendarClock,
  RefreshCcw,
  GanttChart,
  Inbox,
  Diamond,
  PenTool,
  PanelLeftClose,
  PanelLeftOpen,
  FlaskConical,
  Bug,
  FilePen,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ProjectSidebarProps {
  projectId: string;
  projectName: string | undefined;
  projectKey: string | undefined;
}

interface NavSection {
  label: string;
  items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
  }[];
}

function useSidebarSections(baseUrl: string): NavSection[] {
  const canQA = useCan("projects:qa:view");
  const canBugs = useCan("projects:bugs:view");
  const canIncidents = useCan("projects:incidents:view");
  const canChangerequests = useCan("projects:changerequests:view");
  const canClientVisibility = useCan("projects:clientvisibility:manage");
  const canApprovals = useCan("projects:approvals:view");
  const canAI = useCan("projects:ai:use");
  const canForms = useCan("projects:forms:view");
  const canRisks = useCan("projects:risks:view");
  const canDecisions = useCan("projects:decisions:view");
  const canMeetings = useCan("projects:meetings:view");
  const canWorkflow = useCan("projects:workflow:view");
  const canChat = useCan("projects:tickets:view");

  return [
    {
      label: "Planning",
      items: [
        { label: "Board", icon: LayoutGridIcon, href: baseUrl },
        { label: "Backlog", icon: LayoutListIcon, href: `${baseUrl}/backlog` },
        { label: "My Tickets", icon: UserIcon, href: `${baseUrl}/my-tickets` },
        { label: "Sprints", icon: Calendar, href: `${baseUrl}/sprints` },
        ...(canMeetings
          ? [
              {
                label: "Meetings",
                icon: CalendarClock,
                href: `${baseUrl}/meetings`,
              },
            ]
          : []),
        ...(canChat
          ? [
              {
                label: "Chat",
                icon: MessageCircleIcon,
                href: `${baseUrl}/chat`,
              },
            ]
          : []),
      ],
    },
    {
      label: "Tracking",
      items: [
        { label: "Cycles", icon: RefreshCcw, href: `${baseUrl}/cycles` },
        { label: "Modules", icon: PackageOpenIcon, href: `${baseUrl}/modules` },
        { label: "Epics", icon: LayersIcon, href: `${baseUrl}/epics` },
        { label: "Timeline", icon: GanttChart, href: `${baseUrl}/timeline` },
        { label: "Milestones", icon: Diamond, href: `${baseUrl}/milestones` },
        { label: "Releases", icon: RocketIcon, href: `${baseUrl}/releases` },
        { label: "Workload", icon: UsersIcon, href: `${baseUrl}/workload` },
        ...(canApprovals
          ? [
              {
                label: "Approvals",
                icon: CircleCheckIcon,
                href: `${baseUrl}/approvals`,
              },
            ]
          : []),
      ],
    },
    {
      label: "Quality",
      items: [
        ...(canQA
          ? [{ label: "QA / Tests", icon: FlaskConical, href: `${baseUrl}/qa` }]
          : []),
        ...(canBugs
          ? [{ label: "Bugs", icon: Bug, href: `${baseUrl}/bugs` }]
          : []),
        ...(canIncidents
          ? [
              {
                label: "Incidents",
                icon: TriangleAlertIcon,
                href: `${baseUrl}/incidents`,
              },
            ]
          : []),
      ],
    },
    {
      label: "Client",
      items: [
        ...(canChangerequests
          ? [
              {
                label: "Change Requests",
                icon: FilePen,
                href: `${baseUrl}/change-requests`,
              },
            ]
          : []),
        ...(canClientVisibility
          ? [
              {
                label: "Client Portal",
                icon: GlobeIcon,
                href: `${baseUrl}/client-portal`,
              },
            ]
          : []),
      ],
    },
    {
      label: "Governance",
      items: [
        ...(canRisks
          ? [{ label: "Risks", icon: ShieldXIcon, href: `${baseUrl}/risks` }]
          : []),
        ...(canDecisions
          ? [{ label: "Decisions", icon: Gavel, href: `${baseUrl}/decisions` }]
          : []),
      ],
    },
    {
      label: "More",
      items: [
        ...(canForms
          ? [{ label: "Forms", icon: ClipboardIcon, href: `${baseUrl}/forms` }]
          : []),
        ...(canWorkflow
          ? [
              {
                label: "Workflow",
                icon: GitBranchIcon,
                href: `${baseUrl}/workflow`,
              },
            ]
          : []),
        { label: "Wiki", icon: BookOpenTextIcon, href: `${baseUrl}/pages` },
        { label: "Reports", icon: ChartBarIcon, href: `${baseUrl}/analytics` },
        {
          label: "Agile Reports",
          icon: ActivityIcon,
          href: `${baseUrl}/reports`,
        },
        { label: "Whiteboard", icon: PenTool, href: `${baseUrl}/whiteboard` },
        { label: "Budget", icon: IndianRupeeIcon, href: `${baseUrl}/budget` },
        { label: "Intake", icon: Inbox, href: `${baseUrl}/intake` },
        { label: "Automations", icon: ZapIcon, href: `${baseUrl}/automations` },
        { label: "Webhooks", icon: WebhookIcon, href: `${baseUrl}/webhooks` },
        ...(canAI
          ? [
              {
                label: "AI Assistant",
                icon: SparklesIcon,
                href: `${baseUrl}/ai`,
              },
            ]
          : []),
        { label: "Settings", icon: SettingsIcon, href: `${baseUrl}/settings` },
      ],
    },
  ].filter((s) => s.items.length > 0);
}

function useIsActive(baseUrl: string) {
  const pathname = usePathname();
  return (href: string) => {
    if (href === baseUrl) return pathname === baseUrl;
    return pathname === href || pathname?.startsWith(href + "/");
  };
}

function ProjectNavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      {...animatedNavHoverHandlers}
      className={cn(
        "flex items-center rounded-md text-[13px] font-medium transition-colors",
        collapsed ? "justify-center p-1.5 mx-auto" : "px-2 py-1.5",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function MobileProjectNavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate: () => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  return (
    <Link
      href={href}
      onClick={onNavigate}
      {...animatedNavHoverHandlers}
      className={cn(
        "flex items-center px-2 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className="h-4 w-4 mr-2.5 shrink-0"
      />
      {label}
    </Link>
  );
}

const SIDEBAR_COLLAPSED_KEY = "streamlineos:project-sidebar:collapsed";

function getProjectInitials(
  projectKey: string | undefined,
  projectName: string | undefined,
): string {
  const key = projectKey?.trim();
  if (key) return key.substring(0, 2).toUpperCase();
  const name = (projectName ?? "").trim();
  if (!name) return "P";
  const words = name.split(/\s+/).filter((word) => word.length > 0);
  if (words.length >= 2) {
    const first = words[0]?.[0];
    const second = words[1]?.[0];
    if (first && second) return `${first}${second}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function DesktopSidebar({
  projectId,
  projectName,
  projectKey,
}: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const baseUrl = `/projects/${projectId}`;
  const sections = useSidebarSections(baseUrl);
  const isActive = useIsActive(baseUrl);

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <TooltipProvider delayDuration={0}>
    <div
      className={cn(
        "h-full flex flex-col border-r border-border bg-card/50 transition-[width] duration-200 ease-out",
        isCollapsed ? "w-[3.25rem]" : "w-52",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b",
          isCollapsed ? "p-1.5" : "px-3 py-2.5",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-1.5" : "gap-2",
          )}
        >
          <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
            {getProjectInitials(projectKey, projectName)}
          </div>
          {!isCollapsed && (
            <span className="text-sm font-semibold truncate flex-1 min-w-0">
              {projectName ?? "Project"}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
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
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("py-1.5", isCollapsed ? "px-1" : "px-1.5")}>
          {sections.map((section, si) => (
            <div key={section.label}>
              {si > 0 && <div className="my-1.5 mx-1 border-t" />}
              {!isCollapsed && (
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => (
                <ProjectNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
    </TooltipProvider>
  );
}

function MobileProjectNav({
  projectId,
  projectName,
  projectKey,
}: ProjectSidebarProps) {
  const [open, setOpen] = useState(false);
  const baseUrl = `/projects/${projectId}`;
  const sections = useSidebarSections(baseUrl);
  const isActive = useIsActive(baseUrl);
  const pathname = usePathname();

  const allItems = sections.flatMap((s) => s.items);
  const current = allItems.find((i) => isActive(i.href));

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 bg-background">
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
        <SheetContent side="left" className="w-64 p-0 bg-card/50">
          <SheetTitle className="sr-only">Project Navigation</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="px-3 py-3 border-b">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                  {getProjectInitials(projectKey, projectName)}
                </div>
                <span className="text-sm font-semibold truncate">
                  {projectName ?? "Project"}
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-1.5 px-1.5">
                {sections.map((section, si) => (
                  <div key={section.label}>
                    {si > 0 && <div className="my-1.5 mx-1 border-t" />}
                    <p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.label}
                    </p>
                    {section.items.map((item) => (
                      <MobileProjectNavLink
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        active={isActive(item.href)}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-1.5 min-w-0 text-sm">
        <Link
          href={`/projects/${projectId}`}
          className="font-semibold text-foreground shrink-0"
        >
          {projectKey}
        </Link>
        {current && pathname !== baseUrl && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">
              {current.label}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function ProjectSidebar(props: ProjectSidebarProps) {
  return (
    <>
      <div className="hidden md:flex h-full">
        <DesktopSidebar {...props} />
      </div>

      <div className="md:hidden">
        <MobileProjectNav {...props} />
      </div>
    </>
  );
}
