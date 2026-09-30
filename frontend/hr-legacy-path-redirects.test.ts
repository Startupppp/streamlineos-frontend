import nextConfig from "./next.config";

/**
 * BUG-HRMS-013. `/hr/skills`, `/hr/probation` and `/hr/leave` all answered "Page
 * Not Found". The pages exist — at `/hr/employees/skills-matrix` and
 * `/hr/onboarding/probation` — and the sidebar links them correctly, so what QA
 * hit is the address an operator guesses, bookmarks, or reads in a training doc.
 *
 * Asserted against the config rather than a browser because the destinations are
 * the thing that goes stale: move a page and this fails, instead of the redirect
 * quietly pointing at a new 404.
 */

async function redirects() {
  const configured = nextConfig.redirects;
  if (configured === undefined) throw new Error("next.config declares no redirects");
  return configured();
}

describe("legacy HR paths resolve to the page they name", () => {
  it.each([
    ["/hr/skills", "/hr/employees/skills-matrix"],
    ["/hr/probation", "/hr/onboarding/probation"],
    ["/hr/leave", "/hr/leaves"],
  ])("sends %s to %s", async (source, destination) => {
    const entry = (await redirects()).find((rule) => rule.source === source);
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe(destination);
    // Not permanent: these are compatibility aliases, and a 308 would be cached
    // by every browser that ever followed one.
    expect(entry?.permanent).toBe(false);
  });
});
