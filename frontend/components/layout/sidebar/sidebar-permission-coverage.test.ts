import { flattenNavRoutes, NAV_GROUPS } from "./sidebar-nav-items";

/**
 * Every module surface is reached only by someone who holds a permission for it.
 * The exceptions are the universal surfaces the product guarantees to every active
 * member — Home, communication, self-service and knowledge reading — which are
 * deliberately ungated. Anything else without a requirement is visible to people
 * who cannot use it.
 */
const UNIVERSAL_HREFS = ["/settings"];

const UNIVERSAL_HREF_PREFIXES = [
  "/home",
  "/dashboard",
  "/me",
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
 * Access administration is never universal, even under a universal prefix:
 * /chat is everyone's, /chat/access governs who may administer it.
 */
function isAccessAdministration(href: string): boolean {
  return href === "/access" || href.endsWith("/access");
}

function isUniversal(href: string): boolean {
  if (isAccessAdministration(href)) return false;
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
