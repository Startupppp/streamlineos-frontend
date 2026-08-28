export interface UniversalRoute {
  readonly path: string;
  readonly exact?: boolean;
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
    reason:
      "Employee self-service. A member always reaches their own attendance, leave, expenses, pay and employment documents.",
  },
  {
    path: "/mail",
    reason: "Platform core communication surface.",
  },
  {
    path: "/chat",
    reason: "Platform core communication surface.",
  },
  {
    path: "/notifications",
    reason: "Platform core communication surface.",
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
    reason: "People directory reading is platform core.",
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
    reason: "Knowledge Base reading is platform core.",
  },
  {
    path: "/knowledge-base",
    reason: "Knowledge Base reading is platform core.",
  },
  {
    path: "/support/my",
    reason:
      "A member's own support requests, not the helpdesk queue that serves them.",
  },
  {
    path: "/referrals",
    reason:
      "Referrals and internal job openings are universal; the candidate pipeline behind them is not.",
  },
  {
    path: "/jobs",
    reason:
      "Internal job openings are universal; recruitment administration is not.",
  },
  {
    path: "/settings",
    exact: true,
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

export const UNIVERSAL_EXCLUSIONS: readonly UniversalRoute[] = [
  {
    path: "/directory/workers",
    reason:
      "Workforce administration, not the people directory. It is gated on directory:workers:view, which is not a member default, and root §8 places workers under organization governance.",
  },
];

export function isAccessAdministrationPath(pathname: string): boolean {
  return pathname === "/access" || pathname.endsWith("/access");
}

function isUniversalExclusion(pathname: string): boolean {
  return UNIVERSAL_EXCLUSIONS.some(
    (entry) =>
      pathname === entry.path || pathname.startsWith(`${entry.path}/`),
  );
}

export function matchUniversalRoute(pathname: string): UniversalRoute | null {
  if (isAccessAdministrationPath(pathname)) return null;
  if (isUniversalExclusion(pathname)) return null;
  for (const route of UNIVERSAL_ROUTES) {
    if (pathname === route.path) return route;
    if (!route.exact && pathname.startsWith(`${route.path}/`)) return route;
  }
  return null;
}

export function isUniversalRoute(pathname: string): boolean {
  return matchUniversalRoute(pathname) !== null;
}
