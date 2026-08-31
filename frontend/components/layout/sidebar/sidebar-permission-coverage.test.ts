import { flattenNavRoutes, NAV_GROUPS } from "./sidebar-nav-items";

const UNIVERSAL_HREFS = ["/settings"];

const UNIVERSAL_HREF_PREFIXES = [
  "/home",
  "/dashboard",
  "/me",
  "/inbox",
  "/mail",
  "/chat",
  "/notifications",
  "/calendar",
  "/announcements",
  "/directory",
  "/kb",
  "/docs",
  "/knowledge",
  "/support/my",
  "/referrals",
  "/jobs",
];

/**
 * Access administration and module-level settings are never universal, even
 * under a universal prefix: /chat is everyone's, /chat/access and
 * /chat/settings govern admin administration of it. /directory is the people
 * directory (universal), /directory/settings is the directory config (admin).
 */
function isAccessAdministration(href: string): boolean {
  return href === "/access" || href.endsWith("/access");
}

const UNIVERSAL_ADMIN_EXCLUSIONS = [
  "/directory/settings",
];

function isUniversal(href: string): boolean {
  if (isAccessAdministration(href)) return false;
  if (UNIVERSAL_ADMIN_EXCLUSIONS.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  )) return false;
  if (UNIVERSAL_HREFS.includes(href)) return true;
  return UNIVERSAL_HREF_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  );
}

describe("sidebar navigation is permission-driven", () => {
  const routes = flattenNavRoutes(NAV_GROUPS.flatMap((group) => group.routes));

  it("collects the whole navigation tree", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it("gates every non-universal route on a permission", () => {
    const ungated = routes
      .filter((route) => !route.requiredPermission)
      .filter((route) => !isUniversal(route.href))
      .map((route) => `${route.href}  (${route.label})`)
      .sort();
    expect(ungated).toEqual([]);
  });

  it("never gates a universal surface, which every active member keeps", () => {
    const gatedUniversal = routes
      .filter((route) => route.requiredPermission && isUniversal(route.href))
      .map((route) => `${route.href}  (${route.label})`)
      .sort();
    expect(gatedUniversal).toEqual([]);
  });
});
