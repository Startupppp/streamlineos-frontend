import { matchRouteAccessExtension } from "./route-access-extensions";

export interface UniversalDescendant {
  readonly path: string;
  readonly subtree?: boolean;
  readonly childrenOnly?: boolean;
}

export interface UniversalRoute {
  readonly path: string;
  readonly subtree?: boolean;
  readonly universalDescendants?: readonly UniversalDescendant[];
  readonly reason: string;
}

export const UNIVERSAL_ROUTES: readonly UniversalRoute[] = [
  {
    path: "/dashboard",
    reason: "Home. Every active member keeps the cross-module read projection.",
  },
  {
    path: "/home",
    reason: "Home alias. Same surface as /dashboard.",
  },
  {
    path: "/me",
    subtree: true,
    reason:
      "Employee self-service. A member always reaches their own attendance, leave, expenses, pay and employment documents. The entire /me/* subtree is self-service by §8 — no administrative descendants exist here.",
  },
  {
    path: "/mail",
    reason: "Platform core communication surface.",
  },
  {
    path: "/inbox",
    reason:
      "The unified inbox merges notifications, broadcasts, mail and approvals the member is already entitled to. Each source is permission-filtered server-side, so the surface itself is platform core.",
  },
  {
    path: "/chat",
    universalDescendants: [
      { path: "/chat/channels", subtree: true },
      { path: "/chat/invite", subtree: true },
    ],
    reason:
      "Platform core communication surface. Administrative descendants (org-settings, invite-link management) require explicit permission.",
  },
  {
    path: "/notifications",
    universalDescendants: [
      { path: "/notifications/preferences", subtree: true },
    ],
    reason:
      "Platform core communication surface — personal inbox and read state only. Administration (providers, templates, events, policy, broadcasts) is explicitly gated via the extension registry.",
  },
  {
    path: "/calendar",
    reason:
      "One unified calendar serves everyone; module event sources are toggles inside it, not separate surfaces.",
  },
  {
    path: "/announcements",
    reason: "Company announcements are readable by every active member.",
  },
  {
    path: "/hr/announcements",
    reason:
      "The announcements surface lives under the HR prefix but is company-wide reading, not HR administration.",
  },
  {
    path: "/directory",
    reason:
      "People directory root is platform core. Individual profiles and workforce administration resolve through the navigation registry, keeping fail-closed for any new administrative descendants.",
  },
  {
    path: "/kb",
    reason: "Knowledge Base reading is platform core.",
  },
  {
    path: "/docs",
    reason: "Knowledge Base reading is platform core.",
  },
  {
    path: "/knowledge",
    universalDescendants: [
      { path: "/knowledge/wiki" },
      { path: "/knowledge/wiki/shared", subtree: true },
      { path: "/knowledge/wiki/private", subtree: true },
      { path: "/knowledge/wiki/doc", subtree: true },
      { path: "/knowledge/wiki/spaces", childrenOnly: true },
      { path: "/knowledge/chat", subtree: true },
    ],
    reason:
      "Knowledge Base reading is platform core. Administrative surfaces (import, analytics, reviews, templates, trash, space management) are explicitly gated via the extension registry.",
  },
  {
    path: "/settings",
    reason:
      "The personal account landing page. Everything beneath /settings is organization administration and stays permissioned.",
  },
  {
    path: "/access-denied",
    reason:
      "The denial page itself must render, or a denied member sees a redirect loop.",
  },
  {
    path: "/access-suspended",
    reason:
      "The suspension notice must render for a member whose membership is no longer active.",
  },
];

export function isAccessAdministrationPath(pathname: string): boolean {
  return pathname === "/access" || pathname.endsWith("/access");
}

function matchesDescendant(pathname: string, desc: UniversalDescendant): boolean {
  if (desc.childrenOnly) return pathname.startsWith(`${desc.path}/`);
  if (desc.subtree) return pathname === desc.path || pathname.startsWith(`${desc.path}/`);
  return pathname === desc.path;
}

export function matchUniversalRoute(pathname: string): UniversalRoute | null {
  if (isAccessAdministrationPath(pathname)) return null;
  if (matchRouteAccessExtension(pathname) !== null) return null;
  for (const route of UNIVERSAL_ROUTES) {
    if (pathname === route.path) return route;
    if (route.subtree && pathname.startsWith(`${route.path}/`)) return route;
    if (route.universalDescendants?.some((d) => matchesDescendant(pathname, d))) return route;
  }
  return null;
}

export function isUniversalRoute(pathname: string): boolean {
  return matchUniversalRoute(pathname) !== null;
}
