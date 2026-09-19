import type { ComponentType } from "react";
import {
  Activity,
  BarChart3,
  Bookmark,
  BookOpenText,
  Boxes,
  Briefcase,
  Bug,
  Calendar,
  CalendarClock,
  CheckSquare,
  CircleCheck,
  Clipboard,
  ClipboardCheck,
  Building2,
  Diamond,
  FilePen,
  FlaskConical,
  GanttChart,
  Gavel,
  GitBranch,
  Globe,
  IndianRupee,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  Map as MapIcon,
  MessageCircle,
  MessageSquareText,
  Network,
  Package,
  PackageOpen,
  PenTool,
  PenLine,
  Plug,
  Rocket,
  Settings,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { BUILD_ROOT_PATH, type BuildScope } from "./build-scope";

export const BUILD_NAV_MAX_PINS = 3;
export const BUILD_NAV_MAX_PRIMARY = 9;

const FEEDBACK_ORG_MODULE = "feedbucket";

const WORK_BOARD_VIEWS: ReadonlySet<string> = new Set([
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
]);

export type BuildNavBadge = "inbox-unread";

export interface BuildNavDestination {
  id: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiredPermission: PermissionKey | PermissionKey[];
  requiredOrgModule?: string;
  exact?: boolean;
  boardViews?: boolean;
  badge?: BuildNavBadge;
  mobilePriority?: number;
}

export type BuildCreateActionId = "issue" | "project" | "managed-product";

export interface BuildCreateAction {
  id: BuildCreateActionId;
  label: string;
  requiredPermission: PermissionKey;
}

export interface BuildNavAccess {
  can: (permission: PermissionKey) => boolean;
  isOrgModuleEnabled: (orgModuleKey: string) => boolean;
}

export interface BuildNavModelInput {
  scope: BuildScope;
  access: BuildNavAccess;
  pinnedIds: readonly string[];
}

export interface BuildNavModel {
  scope: BuildScope;
  myWork: BuildNavDestination[];
  primary: BuildNavDestination[];
  pinned: BuildNavDestination[];
  moreTools: BuildNavDestination[];
  settings: BuildNavDestination | null;
  browseAll: BuildNavDestination | null;
  createActions: BuildCreateAction[];
}

interface ScopeCatalog {
  primary: BuildNavDestination[];
  moreTools: BuildNavDestination[];
  settings: BuildNavDestination | null;
}

export const BUILD_MY_WORK_DESTINATIONS: BuildNavDestination[] = [
  {
    id: "my-work-inbox",
    label: "Inbox",
    href: `${BUILD_ROOT_PATH}/inbox`,
    icon: Inbox,
    requiredPermission: "build:tickets:view",
    badge: "inbox-unread",
    mobilePriority: 40,
  },
  {
    id: "my-work-assigned",
    label: "Assigned to me",
    href: `${BUILD_ROOT_PATH}/my-work`,
    icon: CheckSquare,
    requiredPermission: "build:tickets:view",
    mobilePriority: 20,
  },
  {
    id: "my-work-drafts",
    label: "Drafts",
    href: `${BUILD_ROOT_PATH}/drafts`,
    icon: PenLine,
    requiredPermission: "build:tickets:view",
    mobilePriority: 50,
  },
];

export const BUILD_BROWSE_ALL_DESTINATION: BuildNavDestination = {
  id: "browse-all",
  label: "Browse all Build",
  href: `${BUILD_ROOT_PATH}/all-work`,
  icon: LayoutList,
  requiredPermission: "build:tickets:view",
};

function organizationCatalog(): ScopeCatalog {
  return {
    primary: [
      {
        id: "org-overview",
        label: "Overview",
        href: `${BUILD_ROOT_PATH}/command-center`,
        icon: LayoutDashboard,
        requiredPermission: "build:view",
        mobilePriority: 10,
      },
      {
        id: "org-projects",
        label: "Projects",
        href: BUILD_ROOT_PATH,
        icon: Briefcase,
        requiredPermission: "build:view",
        exact: true,
        boardViews: true,
        mobilePriority: 30,
      },
      {
        id: "org-products",
        label: "Products",
        href: `${BUILD_ROOT_PATH}/managed-products`,
        icon: Package,
        requiredPermission: "build:managed-products:view",
      },
      {
        id: "org-portfolios",
        label: "Portfolios",
        href: `${BUILD_ROOT_PATH}/portfolios`,
        icon: LayoutGrid,
        requiredPermission: "build:portfolios:view",
      },
      {
        id: "org-programs",
        label: "Programs",
        href: `${BUILD_ROOT_PATH}/programs`,
        icon: Layers,
        requiredPermission: "build:programs:view",
      },
      {
        id: "org-teams",
        label: "Teams",
        href: `${BUILD_ROOT_PATH}/teams`,
        icon: Network,
        requiredPermission: "build:teams:view",
      },
    ],
    moreTools: [
      {
        id: "org-workspaces",
        label: "Workspaces",
        href: `${BUILD_ROOT_PATH}/pm-workspaces`,
        icon: Boxes,
        requiredPermission: "build:workspaces:view",
      },
      {
        id: "org-roadmap",
        label: "Roadmap",
        href: `${BUILD_ROOT_PATH}/roadmap`,
        icon: MapIcon,
        requiredPermission: "build:roadmap:view",
      },
      {
        id: "org-goals",
        label: "Goals",
        href: `${BUILD_ROOT_PATH}/goal`,
        icon: Target,
        requiredPermission: "build:goals:view",
      },
      {
        id: "org-approvals",
        label: "Approvals",
        href: `${BUILD_ROOT_PATH}/approvals`,
        icon: ClipboardCheck,
        requiredPermission: "build:approvals:view",
      },
      {
        id: "org-customers",
        label: "Customers",
        href: `${BUILD_ROOT_PATH}/customers`,
        icon: Building2,
        requiredPermission: "build:customers:view",
      },
      {
        id: "org-templates",
        label: "Templates",
        href: `${BUILD_ROOT_PATH}/templates`,
        icon: LayoutTemplate,
        requiredPermission: "build:create",
      },
      {
        id: "org-client-access",
        label: "Client access",
        href: `${BUILD_ROOT_PATH}/client-access`,
        icon: ShieldCheck,
        requiredPermission: "build:portal:view",
      },
      {
        id: "org-members",
        label: "Members",
        href: `${BUILD_ROOT_PATH}/members`,
        icon: Users,
        requiredPermission: "build:members:view",
      },
      {
        id: "org-access",
        label: "Build access",
        href: `${BUILD_ROOT_PATH}/access`,
        icon: KeyRound,
        requiredPermission: "build:access:view",
      },
    ],
    settings: {
      id: "org-settings",
      label: "Build settings",
      href: `${BUILD_ROOT_PATH}/settings/integrations`,
      icon: Plug,
      requiredPermission: "integrations:git:view",
    },
  };
}

function workspaceCatalog(basePath: string): ScopeCatalog {
  return {
    primary: [
      {
        id: "workspace-overview",
        label: "Overview",
        href: basePath,
        icon: LayoutDashboard,
        requiredPermission: "build:workspaces:view",
        exact: true,
        mobilePriority: 10,
      },
      {
        id: "workspace-work",
        label: "All work",
        href: `${basePath}/all-work`,
        icon: LayoutList,
        requiredPermission: "build:tickets:view",
        mobilePriority: 30,
      },
    ],
    moreTools: [],
    settings: null,
  };
}

function managedProductCatalog(basePath: string): ScopeCatalog {
  return {
    primary: [
      {
        id: "product-overview",
        label: "Overview",
        href: basePath,
        icon: LayoutDashboard,
        requiredPermission: "build:managed-products:view",
        exact: true,
        mobilePriority: 10,
      },
    ],
    moreTools: [],
    settings: null,
  };
}

function projectCatalog(basePath: string): ScopeCatalog {
  return {
    primary: [
      {
        id: "project-issues",
        label: "Issues",
        href: basePath,
        icon: LayoutGrid,
        requiredPermission: "build:tickets:view",
        exact: true,
        boardViews: true,
        mobilePriority: 10,
      },
      {
        id: "project-backlog",
        label: "Backlog",
        href: `${basePath}/backlog`,
        icon: LayoutList,
        requiredPermission: "build:tickets:view",
        mobilePriority: 30,
      },
      {
        id: "project-cycles",
        label: "Cycles",
        href: `${basePath}/sprints`,
        icon: Calendar,
        requiredPermission: "build:sprints:view",
      },
      {
        id: "project-timeline",
        label: "Timeline",
        href: `${basePath}/timeline`,
        icon: GanttChart,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-releases",
        label: "Releases",
        href: `${basePath}/releases`,
        icon: Rocket,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-client-portal",
        label: "Client portal",
        href: `${basePath}/client-portal`,
        icon: Globe,
        requiredPermission: "build:clientvisibility:manage",
      },
    ],
    moreTools: [
      {
        id: "project-triage",
        label: "Triage",
        href: `${basePath}/triage`,
        icon: Inbox,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-epics",
        label: "Epics",
        href: `${basePath}/epics`,
        icon: Layers,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-milestones",
        label: "Milestones",
        href: `${basePath}/milestones`,
        icon: Diamond,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-workload",
        label: "Workload",
        href: `${basePath}?view=workload`,
        icon: Users,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-meetings",
        label: "Meetings",
        href: `${basePath}/meetings`,
        icon: CalendarClock,
        requiredPermission: "build:meetings:view",
      },
      {
        id: "project-approvals",
        label: "Approvals",
        href: `${basePath}/approvals`,
        icon: CircleCheck,
        requiredPermission: "build:approvals:view",
      },
      {
        id: "project-qa",
        label: "QA and tests",
        href: `${basePath}/qa`,
        icon: FlaskConical,
        requiredPermission: "build:qa:view",
      },
      {
        id: "project-bugs",
        label: "Bugs",
        href: `${basePath}/bugs`,
        icon: Bug,
        requiredPermission: "build:bugs:view",
      },
      {
        id: "project-incidents",
        label: "Incidents",
        href: `${basePath}/incidents`,
        icon: TriangleAlert,
        requiredPermission: "build:incidents:view",
      },
      {
        id: "project-change-requests",
        label: "Change requests",
        href: `${basePath}/change-requests`,
        icon: FilePen,
        requiredPermission: "build:changerequests:view",
      },
      {
        id: "project-intake",
        label: "Intake",
        href: `${basePath}/intake`,
        icon: ClipboardCheck,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-feedback",
        label: "Feedback",
        href: `${basePath}/feedbucket`,
        icon: MessageSquareText,
        requiredPermission: "feedbucket:submissions:view",
        requiredOrgModule: FEEDBACK_ORG_MODULE,
      },
      {
        id: "project-chat",
        label: "Chat",
        href: `${basePath}/chat`,
        icon: MessageCircle,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-wiki",
        label: "Wiki",
        href: `${basePath}/wiki`,
        icon: BookOpenText,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-whiteboard",
        label: "Whiteboard",
        href: `${basePath}/whiteboard`,
        icon: PenTool,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-analytics",
        label: "Analytics",
        href: `${basePath}/analytics`,
        icon: BarChart3,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-reports",
        label: "Agile reports",
        href: `${basePath}/reports`,
        icon: Activity,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-budget",
        label: "Budget",
        href: `${basePath}/budget`,
        icon: IndianRupee,
        requiredPermission: "build:manage",
      },
      {
        id: "project-risks",
        label: "Risks",
        href: `${basePath}/risks`,
        icon: ShieldX,
        requiredPermission: "build:risks:view",
      },
      {
        id: "project-decisions",
        label: "Decisions",
        href: `${basePath}/decisions`,
        icon: Gavel,
        requiredPermission: "build:decisions:view",
      },
      {
        id: "project-views",
        label: "Saved views",
        href: `${basePath}/views`,
        icon: Bookmark,
        requiredPermission: "build:tickets:view",
      },
      {
        id: "project-forms",
        label: "Forms",
        href: `${basePath}/forms`,
        icon: Clipboard,
        requiredPermission: "build:forms:view",
      },
      {
        id: "project-workflow",
        label: "Workflow",
        href: `${basePath}/workflow`,
        icon: GitBranch,
        requiredPermission: "build:workflow:view",
      },
      {
        id: "project-modules",
        label: "Modules",
        href: `${basePath}/modules`,
        icon: PackageOpen,
        requiredPermission: "build:view",
      },
      {
        id: "project-automations",
        label: "Automations",
        href: `${basePath}/automations`,
        icon: Zap,
        requiredPermission: "build:view",
      },
      {
        id: "project-webhooks",
        label: "Webhooks",
        href: `${basePath}/webhooks`,
        icon: Webhook,
        requiredPermission: "build:manage",
      },
      {
        id: "project-ai",
        label: "AI settings",
        href: `${basePath}/ai`,
        icon: Sparkles,
        requiredPermission: "build:ai:use",
      },
    ],
    settings: {
      id: "project-settings",
      label: "Project settings",
      href: `${basePath}/settings`,
      icon: Settings,
      requiredPermission: "build:update",
    },
  };
}

export function buildScopeCatalog(scope: BuildScope): ScopeCatalog {
  const buildScopeCatalog = {
    workspace: workspaceCatalog,
    product: managedProductCatalog,
    project: projectCatalog,
    organization: organizationCatalog,
  };
  return buildScopeCatalog[scope.type](scope.basePath) ?? organizationCatalog();
}

export function buildOrganizationCatalog(): ScopeCatalog {
  return organizationCatalog();
}

function isPermitted(
  destination: BuildNavDestination,
  access: BuildNavAccess,
): boolean {
  if (
    destination.requiredOrgModule !== undefined &&
    !access.isOrgModuleEnabled(destination.requiredOrgModule)
  )
    return false;
  const required = destination.requiredPermission;
  const keys = Array.isArray(required) ? required : [required];
  return keys.some((key) => access.can(key));
}

function permitted(
  destinations: BuildNavDestination[],
  access: BuildNavAccess,
): BuildNavDestination[] {
  return destinations.filter((destination) => isPermitted(destination, access));
}

function createActionsFor(
  scope: BuildScope,
  access: BuildNavAccess,
): BuildCreateAction[] {
  const actions: BuildCreateAction[] = [
    { id: "issue", label: "Issue", requiredPermission: "build:tickets:create" },
    { id: "project", label: "Project", requiredPermission: "build:create" },
  ];
  if (scope.type !== "project")
    actions.push({
      id: "managed-product",
      label: "Product",
      requiredPermission: "build:managed-products:create",
    });
  return actions.filter((action) => access.can(action.requiredPermission));
}

export function resolveBuildNavModel({
  scope,
  access,
  pinnedIds,
}: BuildNavModelInput): BuildNavModel {
  const catalog = buildScopeCatalog(scope);
  const primary = permitted(catalog.primary, access).slice(
    0,
    BUILD_NAV_MAX_PRIMARY,
  );
  const moreTools = permitted(catalog.moreTools, access);
  const settings =
    catalog.settings && isPermitted(catalog.settings, access)
      ? catalog.settings
      : null;
  const pinnedOrder = new Map(pinnedIds.map((id, index) => [id, index]));
  const pinned = moreTools
    .filter((destination) => pinnedOrder.has(destination.id))
    .sort(
      (left, right) =>
        (pinnedOrder.get(left.id) ?? 0) - (pinnedOrder.get(right.id) ?? 0),
    )
    .slice(0, BUILD_NAV_MAX_PINS);

  return {
    scope,
    myWork: permitted(BUILD_MY_WORK_DESTINATIONS, access),
    primary,
    pinned,
    moreTools,
    settings,
    browseAll: isPermitted(BUILD_BROWSE_ALL_DESTINATION, access)
      ? BUILD_BROWSE_ALL_DESTINATION
      : null,
    createActions: createActionsFor(scope, access),
  };
}


export function isBuildNavModelEmpty(model: BuildNavModel): boolean {
  return (
    model.primary.length === 0 &&
    model.myWork.length === 0 &&
    model.moreTools.length === 0 &&
    model.settings === null
  );
}

export function splitDestinationHref(href: string): {
  path: string;
  view: string | null;
} {
  const separator = href.indexOf("?");
  if (separator === -1) return { path: href, view: null };
  return {
    path: href.slice(0, separator),
    view: new URLSearchParams(href.slice(separator + 1)).get("view"),
  };
}

export function isBuildDestinationActive(
  destination: BuildNavDestination,
  pathname: string,
  view: string | null,
): boolean {
  const { path, view: expectedView } = splitDestinationHref(destination.href);
  if (expectedView !== null) return pathname === path && view === expectedView;
  if (destination.exact) {
    if (pathname !== path) return false;
    if (!destination.boardViews) return true;
    return view === null || WORK_BOARD_VIEWS.has(view);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

