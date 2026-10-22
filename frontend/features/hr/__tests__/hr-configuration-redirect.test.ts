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
