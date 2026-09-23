import type { ReactNode, RefObject } from "react";
import {
  LayoutListIcon,
  LayersIcon,
  RocketIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Inbox,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import type { PermissionKey } from "@/lib/rbac/permissions";

type IconRef = RefObject<IconHandle | null>;

export type JumpLinkScope = "workspace" | "project";

export interface CommandCenterJumpLink {
  id: string;
  label: string;
  scope: JumpLinkScope;
  permissions: PermissionKey[];
  permissionMode?: "any" | "all";
  enabledModule?: string;
  accessModuleKey?: string;
  buildHref: (projectId: number | null) => string;
  renderIcon: (ref: IconRef) => ReactNode;
}

function workspaceHref(path: string) {
  return (_: number | null) => path;
}

function projectHref(path: string) {
  return (projectId: number | null) =>
    projectId === null ? "/build" : `/build/${projectId}${path}`;
}

function renderInboxIcon(_: IconRef) {
  return <Inbox className="h-[13px] w-[13px]" />;
}

function renderClipboardCheckIcon(_: IconRef) {
  return <ClipboardCheck className="h-[13px] w-[13px]" />;
}

function renderUsersIcon(_: IconRef) {
  return <Users className="h-[13px] w-[13px]" />;
}

function renderBookOpenIcon(_: IconRef) {
  return <BookOpen className="h-[13px] w-[13px]" />;
}

function renderCalendarClockIcon(_: IconRef) {
  return <CalendarClock className="h-[13px] w-[13px]" />;
}

function renderMessageCircleIcon(_: IconRef) {
  return <MessageCircle className="h-[13px] w-[13px]" />;
}

function renderSparklesIcon(_: IconRef) {
  return <Sparkles className="h-[13px] w-[13px]" />;
}

function renderLayoutListIcon(ref: IconRef) {
  return <LayoutListIcon ref={ref} size={13} />;
}

function renderLayersIcon(ref: IconRef) {
  return <LayersIcon ref={ref} size={13} />;
}

function renderRocketIcon(ref: IconRef) {
  return <RocketIcon ref={ref} size={13} />;
}

export const COMMAND_CENTER_JUMP_LINKS: CommandCenterJumpLink[] = [
  {
    id: "my-issues",
    label: "My issues",
    scope: "workspace",
    permissions: ["build:tickets:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build/my-work"),
    renderIcon: renderLayoutListIcon,
  },
  {
    id: "inbox",
    label: "Inbox",
    scope: "workspace",
    permissions: ["build:tickets:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build/inbox"),
    renderIcon: renderInboxIcon,
  },
  {
    id: "projects",
    label: "Projects",
    scope: "workspace",
    permissions: ["build:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build"),
    renderIcon: renderLayersIcon,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    scope: "workspace",
    permissions: ["build:roadmap:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build/roadmap"),
    renderIcon: renderRocketIcon,
  },
  {
    id: "approvals",
    label: "Approvals",
    scope: "workspace",
    permissions: ["build:approvals:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build/approvals"),
    renderIcon: renderClipboardCheckIcon,
  },
  {
    id: "teams",
    label: "Teams",
    scope: "workspace",
    permissions: ["build:teams:view"],
    enabledModule: "PROJECTS",
    buildHref: workspaceHref("/build/teams"),
    renderIcon: renderUsersIcon,
  },
  {
    id: "wiki",
    label: "Wiki",
    scope: "project",
    permissions: ["kb:pages:view"],
    enabledModule: "KB",
    accessModuleKey: "kb",
    buildHref: projectHref("/wiki"),
    renderIcon: renderBookOpenIcon,
  },
  {
    id: "meetings",
    label: "Meetings",
    scope: "project",
    permissions: ["build:meetings:view"],
    enabledModule: "PROJECTS",
    buildHref: projectHref("/meetings"),
    renderIcon: renderCalendarClockIcon,
  },
  {
    id: "chat",
    label: "Chat",
    scope: "project",
    permissions: ["build:tickets:view"],
    enabledModule: "PROJECTS",
    buildHref: projectHref("/chat"),
    renderIcon: renderMessageCircleIcon,
  },
  {
    id: "ai",
    label: "AI",
    scope: "project",
    permissions: ["build:ai:use"],
    enabledModule: "PROJECTS",
    buildHref: projectHref("/ai"),
    renderIcon: renderSparklesIcon,
  },
];
