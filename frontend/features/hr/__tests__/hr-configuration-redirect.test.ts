/**
 * HRMS-E2E-031. `/hr/configuration` answered Page Not Found for a member and a
 * manager. It was never a route: the sidebar item reading "HR configuration"
 * points at `/hr/settings`, so the label and the URL disagreed and anyone who
 * typed what the nav called it hit a bare 404.
 *
 * It is an alias, not a page. A page under `app/(authenticated)/hr` would need
 * its own entry in the route-access registry (FE-54) — a gated surface that
 * renders nothing, standing in for a name that simply had no address. The
 * redirect lets `/hr/settings` answer with its own gate instead.
 *
 * Both halves are pinned, because a redirect pointing somewhere the nav no
 * longer does would be the same bug again in the other direction.
 */
import nextConfig from "@/next.config";
import { HR_SETTINGS_ROUTES } from "@/components/layout/sidebar/sidebar-nav-routes-hr-settings";

describe("/hr/configuration", () => {
  it("sends anyone who types the nav's own words to a real page", async () => {
    const redirects = await nextConfig.redirects?.();
    const alias = redirects?.find((entry) => entry.source === "/hr/configuration");

    expect(alias?.destination).toBe("/hr/settings");
  });

  it("is temporary, so the alias can be retired without a cached 308 outliving it", async () => {
    const redirects = await nextConfig.redirects?.();
    const alias = redirects?.find((entry) => entry.source === "/hr/configuration");

    expect(alias?.permanent).toBe(false);
  });

  it("still matches where the sidebar points, so the two cannot drift apart", () => {
    const entry = HR_SETTINGS_ROUTES.find((route) => route.label === "HR configuration");

    expect(entry?.href).toBe("/hr/settings");
  });
});
