import type { ComponentType } from "react";
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
  Diamond,
  FlaskConical,
  Bug,
  FilePen,
  Gavel,
  GanttChart,
  Inbox,
  MessageSquareText,
  PenTool,
  RefreshCcw,
} from "lucide-react";

export interface ProjectNavItem {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: boolean;
}

export interface ProjectNavGroup {
  id: string;
  label: string;
  items: ProjectNavItem[];
}

export const PINNED_PROJECT_NAV_IDS = new Set<string>(["issues"]);

export function isProjectNavPinned(id: string): boolean {
  return PINNED_PROJECT_NAV_IDS.has(id);
}

export function filterVisibleNavItems<T extends { id: string }>(
  items: T[],
  hiddenIds: ReadonlySet<string>,
): T[] {
  return items.filter(
    (item) => isProjectNavPinned(item.id) || !hiddenIds.has(item.id),
  );
}

export function filterVisibleNavGroups(
  groups: ProjectNavGroup[],
  hiddenIds: ReadonlySet<string>,
): ProjectNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterVisibleNavItems(group.items, hiddenIds),
    }))
    .filter((group) => group.items.length > 0);
}

export interface ProjectNavPermissions {
  canQA: boolean;
  canBugs: boolean;
  canIncidents: boolean;
  canChangerequests: boolean;
  canClientVisibility: boolean;
  canApprovals: boolean;
  canAI: boolean;
  canForms: boolean;
  canRisks: boolean;
  canDecisions: boolean;
  canMeetings: boolean;
  canWorkflow: boolean;
  canChat: boolean;
  canFeedback: boolean;
}

export function buildPrimaryNav(
  baseUrl: string,
  perms: ProjectNavPermissions,
): ProjectNavItem[] {
  return [
    { id: "issues", label: "Issues", href: baseUrl, icon: LayoutGridIcon },
    { id: "backlog", label: "Backlog", href: `${baseUrl}/backlog`, icon: LayoutListIcon },
    { id: "mine", label: "My issues", href: `${baseUrl}/my-tickets`, icon: UserIcon },
    { id: "cycles", label: "Cycles", href: `${baseUrl}/sprints`, icon: Calendar },
    { id: "epics", label: "Epics", href: `${baseUrl}/epics`, icon: LayersIcon },
    { id: "timeline", label: "Timeline", href: `${baseUrl}/timeline`, icon: GanttChart },
    ...(perms.canChat
      ? [{ id: "chat", label: "Chat", href: `${baseUrl}/chat`, icon: MessageCircleIcon }]
      : []),
  ];
}

export function buildMoreGroups(
  baseUrl: string,
  perms: ProjectNavPermissions,
): ProjectNavGroup[] {
  const plan: ProjectNavItem[] = [
    { id: "milestones", label: "Milestones", href: `${baseUrl}/milestones`, icon: Diamond },
    { id: "releases", label: "Releases", href: `${baseUrl}/releases`, icon: RocketIcon },
    { id: "cycles-detail", label: "Iterations", href: `${baseUrl}/cycles`, icon: RefreshCcw },
    { id: "workload", label: "Workload", href: `${baseUrl}?view=workload`, icon: UsersIcon },
    ...(perms.canMeetings
      ? [{ id: "meetings", label: "Meetings", href: `${baseUrl}/meetings`, icon: CalendarClock }]
      : []),
    ...(perms.canApprovals
      ? [
          {
            id: "approvals",
            label: "Approvals",
            href: `${baseUrl}/approvals`,
            icon: CircleCheckIcon,
          },
        ]
      : []),
  ];

  const quality: ProjectNavItem[] = [
    ...(perms.canQA
      ? [{ id: "qa", label: "QA / Tests", href: `${baseUrl}/qa`, icon: FlaskConical }]
      : []),
    ...(perms.canBugs
      ? [{ id: "bugs", label: "Bugs", href: `${baseUrl}/bugs`, icon: Bug }]
      : []),
    ...(perms.canIncidents
      ? [
          {
            id: "incidents",
            label: "Incidents",
            href: `${baseUrl}/incidents`,
            icon: TriangleAlertIcon,
          },
        ]
      : []),
  ];

  const delivery: ProjectNavItem[] = [
    ...(perms.canChangerequests
      ? [
          {
            id: "crs",
            label: "Change requests",
            href: `${baseUrl}/change-requests`,
            icon: FilePen,
          },
        ]
      : []),
    ...(perms.canClientVisibility
      ? [
          {
            id: "client",
            label: "Client portal",
            href: `${baseUrl}/client-portal`,
            icon: GlobeIcon,
          },
        ]
      : []),
    { id: "intake", label: "Intake", href: `${baseUrl}/intake`, icon: Inbox },
    ...(perms.canFeedback
      ? [
          {
            id: "feedback",
            label: "Feedback",
            href: `${baseUrl}/feedbucket`,
            icon: MessageSquareText,
          },
        ]
      : []),
  ];

  const insights: ProjectNavItem[] = [
    { id: "analytics", label: "Analytics", href: `${baseUrl}/analytics`, icon: ChartBarIcon },
    { id: "reports", label: "Agile reports", href: `${baseUrl}/reports`, icon: ActivityIcon },
    { id: "budget", label: "Budget", href: `${baseUrl}/budget`, icon: IndianRupeeIcon },
    ...(perms.canRisks
      ? [{ id: "risks", label: "Risks", href: `${baseUrl}/risks`, icon: ShieldXIcon }]
      : []),
    ...(perms.canDecisions
      ? [{ id: "decisions", label: "Decisions", href: `${baseUrl}/decisions`, icon: Gavel }]
      : []),
  ];

  const configure: ProjectNavItem[] = [
    { id: "modules", label: "Modules", href: `${baseUrl}/modules`, icon: PackageOpenIcon },
    { id: "wiki", label: "Wiki", href: `${baseUrl}/pages`, icon: BookOpenTextIcon },
    { id: "whiteboard", label: "Whiteboard", href: `${baseUrl}/whiteboard`, icon: PenTool },
    { id: "views", label: "Saved views", href: `${baseUrl}/views`, icon: LayoutListIcon },
    ...(perms.canForms
      ? [{ id: "forms", label: "Forms", href: `${baseUrl}/forms`, icon: ClipboardIcon }]
      : []),
    ...(perms.canWorkflow
      ? [{ id: "workflow", label: "Workflow", href: `${baseUrl}/workflow`, icon: GitBranchIcon }]
      : []),
    { id: "automations", label: "Automations", href: `${baseUrl}/automations`, icon: ZapIcon },
    { id: "webhooks", label: "Webhooks", href: `${baseUrl}/webhooks`, icon: WebhookIcon },
    ...(perms.canAI
      ? [{ id: "ai", label: "AI assistant", href: `${baseUrl}/ai`, icon: SparklesIcon }]
      : []),
  ];

  return [
    { id: "plan", label: "Plan", items: plan },
    { id: "quality", label: "Quality", items: quality },
    { id: "delivery", label: "Delivery", items: delivery },
    { id: "insights", label: "Insights", items: insights },
    { id: "configure", label: "Configure", items: configure },
  ].filter((g) => g.items.length > 0);
}

export function settingsNavItem(baseUrl: string): ProjectNavItem {
  return {
    id: "settings",
    label: "Settings",
    href: `${baseUrl}/settings`,
    icon: SettingsIcon,
  };
}
