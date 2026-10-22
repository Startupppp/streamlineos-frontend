/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import nextConfig from "@/next.config";

type RedirectEntry = { source: string; destination: string; permanent: boolean };

const PM_WORKSPACE_JOB_MOVES: ReadonlyArray<readonly [string, string]> = [
  ["/build/workspaces/:pmWorkspaceId/my-work", "/build/my-work"],
  ["/build/workspaces/:pmWorkspaceId/overview", "/build/command-center"],
  ["/build/workspaces/:pmWorkspaceId/all-work", "/build/all-work"],
  ["/build/workspaces/:pmWorkspaceId/goals", "/build/goals"],
  ["/build/workspaces/:pmWorkspaceId/products", "/build/managed-products"],
  ["/build/workspaces/:pmWorkspaceId/roadmap", "/build/roadmap"],
  ["/build/workspaces/:pmWorkspaceId/teams", "/build/teams"],
];

async function getRedirects(): Promise<RedirectEntry[]> {
  const result = await nextConfig.redirects?.();
  return (result ?? []) as RedirectEntry[];
}

describe("next.config.ts redirects — dead auth routes resolve to /signin", () => {
  test("/register redirects permanently to /signin", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/register");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/signin");
    expect(entry?.permanent).toBe(true);
  });

  test("/auth/login redirects permanently to /signin", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/auth/login");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/signin");
    expect(entry?.permanent).toBe(true);
  });

  test("/auth/signin redirects permanently to /signin", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/auth/signin");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/signin");
    expect(entry?.permanent).toBe(true);
  });

  test("/auth/register redirects permanently to /signin", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/auth/register");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/signin");
    expect(entry?.permanent).toBe(true);
  });

  test("/sign-in redirects permanently to /signin", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/sign-in");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/signin");
    expect(entry?.permanent).toBe(true);
  });

  test("/hrms redirects to /hr so the legacy URL resolves inside the app shell", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/hrms");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/hr");
    expect(entry?.permanent).toBe(false);
  });

  test("/signup and /login redirect entries remain (no regression)", async () => {
    const redirects = await getRedirects();
    const signup = redirects.find((r) => r.source === "/signup");
    const login = redirects.find((r) => r.source === "/login");
    expect(signup?.destination).toBe("/signin");
    expect(login?.destination).toBe("/signin");
  });
});

describe("next.config.ts redirects — PM Workspace is removed, and every deep link still lands (BLD-02D-005)", () => {
  test.each(PM_WORKSPACE_JOB_MOVES)(
    "%s redirects to %s, the organization-scope route that inherited the job",
    async (source, destination) => {
      const redirects = await getRedirects();
      const entry = redirects.find((r) => r.source === source);
      expect(entry).toBeDefined();
      expect(entry?.destination).toBe(destination);
    },
  );

  test("the workspace root and its id route both fall back to Projects, so a bare deep link is not a 404", async () => {
    const redirects = await getRedirects();
    expect(
      redirects.find((r) => r.source === "/build/workspaces")?.destination,
    ).toBe("/build/projects");
    expect(
      redirects.find((r) => r.source === "/build/workspaces/:pmWorkspaceId")
        ?.destination,
    ).toBe("/build/projects");
    expect(
      redirects.find((r) => r.source === "/build/pm-workspaces")?.destination,
    ).toBe("/build/projects");
  });

  test("a source that was never declared is not found, so the lookups above can fail", async () => {
    const redirects = await getRedirects();
    expect(redirects.length).toBeGreaterThan(0);
    expect(
      redirects.find((r) => r.source === "/build/workspaces/:pmWorkspaceId/nope"),
    ).toBeUndefined();
  });

  test("the page tree is deleted rather than redirecting from a surviving page", () => {
    const build = join(process.cwd(), "app", "(authenticated)", "build");
    expect(existsSync(join(build, "workspaces"))).toBe(false);
    expect(existsSync(join(build, "pm-workspaces"))).toBe(false);
    expect(existsSync(join(build, "my-work"))).toBe(true);
  });
});

describe("next.config.ts redirects — leave alias", () => {
  test("/me/leave redirects to the time-off section", async () => {
    const redirects = await getRedirects();
    const entry = redirects.find((r) => r.source === "/me/leave");
    expect(entry).toBeDefined();
    expect(entry?.destination).toBe("/me/workday?section=time-off");
    expect(entry?.permanent).toBe(false);
  });
});

describe("self-service page consolidation", () => {
  const moves = [
    ["/me/attendance", "/me/workday"],
    ["/me/time-off", "/me/workday?section=time-off"],
    ["/me/documents", "/me/records"],
    ["/me/onboarding", "/me/records?section=onboarding"],
    ["/me/expenses", "/me/money"],
    ["/me/pay", "/me/money?section=pay"],
    ["/me/recruitment", "/me/career"],
    ["/me/job-openings", "/me/career?section=openings"],
    ["/me/referrals", "/me/career?section=referrals"],
  ] as const;

  test.each(moves)("%s redirects to %s", async (source, destination) => {
    const redirects = await getRedirects();
    expect(redirects.find((entry) => entry.source === source)?.destination).toBe(destination);
    expect(existsSync(join(process.cwd(), "app", "(authenticated)", source.slice(1), "page.tsx"))).toBe(false);
  });
});
