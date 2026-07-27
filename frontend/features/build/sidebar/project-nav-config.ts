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
  ListChecks,
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

export type ProjectNavSectionId =
  | "build"
  | "plan"
  | "ship"
  | "collaborate"
  | "insights"
  | "configure";

export interface ProjectNavGroup {
  id: ProjectNavSectionId;
  label: string;
  pinned?: boolean;
  defaultOpen?: boolean;
  items: ProjectNavItem[];
}

export const PINNED_PROJECT_NAV_IDS = new Set<string>(["issues"]);

export const DEFAULT_HIDDEN_PROJECT_NAV_IDS = new Set<string>([
  "triage",
  "milestones",
  "releases",
  "cycles-detail",
  "workload",
  "meetings",
  "approvals",
  "qa",
  "bugs",
  "incidents",
  "crs",
  "client",
  "intake",
  "feedback",
  "analytics",
  "reports",
  "budget",
  "risks",
  "decisions",
  "modules",
  "wiki",
  "whiteboard",
  "views",
  "forms",
  "workflow",
  "automations",
  "webhooks",
  "ai",
]);

export function isProjectNavPinned(id: string): boolean {
  return PINNED_PROJECT_NAV_IDS.has(id);
}

export function isDefaultProjectNavHidden(
  hiddenIds: ReadonlySet<string>,
): boolean {
  if (hiddenIds.size !== DEFAULT_HIDDEN_PROJECT_NAV_IDS.size) return false;
  for (const id of DEFAULT_HIDDEN_PROJECT_NAV_IDS) {
    if (!hiddenIds.has(id)) return false;
  }
  return true;
}

export function flattenProjectNavItems(
  groups: ProjectNavGroup[],
): ProjectNavItem[] {
  return groups.flatMap((group) => group.items);
}

export function filterVisibleNavGroups(
  groups: ProjectNavGroup[],
  hiddenIds: ReadonlySet<string>,
): ProjectNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => isProjectNavPinned(item.id) || !hiddenIds.has(item.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterHiddenNavGroups(
  groups: ProjectNavGroup[],
  hiddenIds: ReadonlySet<string>,
): ProjectNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !isProjectNavPinned(item.id) && hiddenIds.has(item.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export interface ProjectNavPermissions {
  canProjectData: boolean;
  canTickets: boolean;
  canSprints: boolean;
  canSettings: boolean;
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

export function buildProjectNavGroups(
  baseUrl: string,
  perms: ProjectNavPermissions,
): ProjectNavGroup[] {
  if (!perms.canProjectData) return [];

  const build: ProjectNavItem[] = perms.canTickets
    ? [
        { id: "issues", label: "Issues", href: baseUrl, icon: LayoutGridIcon },
        { id: "backlog", label: "Backlog", href: `${baseUrl}/backlog`, icon: LayoutListIcon },
        { id: "mine", label: "My issues", href: `${baseUrl}/my-tickets`, icon: UserIcon },
        { id: "triage", label: "Triage", href: `${baseUrl}/triage`, icon: ListChecks },
      ]
    : [];

  const plan: ProjectNavItem[] = [
    ...(perms.canSprints
      ? [{ id: "cycles", label: "Cycles", href: `${baseUrl}/sprints`, icon: Calendar }]
      : []),
    ...(perms.canTickets
      ? [
          { id: "epics", label: "Epics", href: `${baseUrl}/epics`, icon: LayersIcon },
          { id: "timeline", label: "Timeline", href: `${baseUrl}/timeline`, icon: GanttChart },
        ]
      : []),
    { id: "milestones", label: "Milestones", href: `${baseUrl}/milestones`, icon: Diamond },
    { id: "workload", label: "Workload", href: `${baseUrl}?view=workload`, icon: UsersIcon },
    ...(perms.canMeetings
      ? [{ id: "meetings", label: "Meetings", href: `${baseUrl}/meetings`, icon: CalendarClock }]
      : []),
  ];

  const ship: ProjectNavItem[] = [
    { id: "releases", label: "Releases", href: `${baseUrl}/releases`, icon: RocketIcon },
    { id: "cycles-detail", label: "Iterations", href: `${baseUrl}/cycles`, icon: RefreshCcw },
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

  const collaborate: ProjectNavItem[] = [
    ...(perms.canChat
      ? [{ id: "chat", label: "Chat", href: `${baseUrl}/chat`, icon: MessageCircleIcon }]
      : []),
    { id: "wiki", label: "Wiki", href: `${baseUrl}/wiki`, icon: BookOpenTextIcon },
    { id: "whiteboard", label: "Whiteboard", href: `${baseUrl}/whiteboard`, icon: PenTool },
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

  const groups: ProjectNavGroup[] = [
    { id: "build", label: "Build", pinned: true, defaultOpen: true, items: build },
    { id: "plan", label: "Plan", defaultOpen: true, items: plan },
    { id: "ship", label: "Ship", defaultOpen: false, items: ship },
    { id: "collaborate", label: "Collaborate", defaultOpen: true, items: collaborate },
    { id: "insights", label: "Insights", defaultOpen: false, items: insights },
    { id: "configure", label: "Configure", defaultOpen: false, items: configure },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function settingsNavItem(
  baseUrl: string,
  canSettings: boolean,
): ProjectNavItem | null {
  if (!canSettings) return null;
  return {
    id: "settings",
    label: "Settings",
    href: `${baseUrl}/settings`,
    icon: SettingsIcon,
  };
}
