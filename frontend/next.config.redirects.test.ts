/**
 * @jest-environment node
 */
import nextConfig from "@/next.config";

type RedirectEntry = { source: string; destination: string; permanent: boolean };

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

  test("/signup and /login redirect entries remain (no regression)", async () => {
    const redirects = await getRedirects();
    const signup = redirects.find((r) => r.source === "/signup");
    const login = redirects.find((r) => r.source === "/login");
    expect(signup?.destination).toBe("/signin");
    expect(login?.destination).toBe("/signin");
  });
});
