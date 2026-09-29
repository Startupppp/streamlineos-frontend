import { existsSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "@/next.config";

const AUTHENTICATED_ROOT = join(process.cwd(), "app", "(authenticated)");

async function redirectFor(source: string) {
  const redirects = await nextConfig.redirects?.();
  return redirects?.find((entry) => entry.source === source);
}

function pageExists(route: string): boolean {
  return existsSync(
    join(AUTHENTICATED_ROOT, ...route.split("/").filter(Boolean), "page.tsx"),
  );
}

describe("HRMS dead canonical routes (BUG-006, BUG-010)", () => {
  it("parses a non-trivial redirect table, so a table that resolved to nothing cannot pass this suite vacuously", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects?.length ?? 0).toBeGreaterThan(10);
  });

  it("BUG-006: /hr/dashboard answered a bare 404 for a bookmarked HR home, so it now hands off to /hr", async () => {
    expect((await redirectFor("/hr/dashboard"))?.destination).toBe("/hr");
  });

  it("BUG-010: /hr/settings/company answered a bare 404, so it now hands off to the organization settings that own company data", async () => {
    expect((await redirectFor("/hr/settings/company"))?.destination).toBe(
      "/settings/organization",
    );
  });

  it.each(["/hr/dashboard", "/hr/settings/company"])(
    "%s is temporary, so the alias can be retired without a cached 308 outliving it",
    async (source) => {
      expect((await redirectFor(source))?.permanent).toBe(false);
    },
  );

  it.each(["/hr/dashboard", "/hr/settings/company"])(
    "%s has no page of its own, so the redirect is the only thing standing between a bookmark and Page Not Found",
    (source) => {
      expect(pageExists(source)).toBe(false);
    },
  );

  it.each(["/hr", "/settings/organization"])(
    "%s is a real page, so neither redirect lands on a second 404",
    (destination) => {
      expect(pageExists(destination)).toBe(true);
    },
  );
});
