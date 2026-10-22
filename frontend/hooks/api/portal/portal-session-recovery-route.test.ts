import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";


const APP_DIR = resolve(__dirname, "..", "..", "..", "app");

const isTransparentSegment = (name: string): boolean =>
  name.startsWith("(") || name.startsWith("@");

function routeResolves(pathname: string): boolean {
  const wanted = pathname.split("?")[0]!.split("/").filter(Boolean);

  const walk = (dir: string, index: number): boolean => {
    if (index === wanted.length) {
      return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((f) =>
        existsSync(join(dir, f)),
      );
    }
    const segment = wanted[index]!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return false;
    }
    const dirs = entries.filter((e) => {
      try {
        return statSync(join(dir, e)).isDirectory();
      } catch {
        return false;
      }
    });

    for (const e of dirs) {
      if (isTransparentSegment(e) && walk(join(dir, e), index)) return true;
    }
    if (dirs.includes(segment) && walk(join(dir, segment), index + 1)) return true;
    for (const e of dirs) {
      if (/^\[.+\]$/.test(e) && walk(join(dir, e), index + 1)) return true;
    }
    return false;
  };

  return walk(APP_DIR, 0);
}

const PRODUCERS = [
  { file: "hooks/api/portal/use-portal-guard.ts", reason: "no_token" },
  { file: "lib/portal-api-client.ts", reason: "expired" },
] as const;

const REPO = resolve(__dirname, "..", "..", "..");

function recoveryTargets(): { file: string; url: string; reason: string }[] {
  return PRODUCERS.map(({ file, reason }) => {
    const source = readFileSync(join(REPO, file), "utf8");
    const match = new RegExp(`["'\`](/[^"'\`\\s]*\\?reason=${reason})["'\`]`).exec(source);
    if (!match) {
      throw new Error(`${file} no longer produces a literal URL carrying ?reason=${reason}`);
    }
    return { file, url: match[1]!, reason };
  });
}

describe("portal session recovery targets a route that exists", () => {
  it("ANTI-VACUITY: the resolver rejects the dead URL and accepts the live one", () => {
    expect(routeResolves("/accept-invitation")).toBe(true);
    expect(routeResolves("/portal/accept-invitation")).toBe(true);
    expect(
      existsSync(join(APP_DIR, "(authenticated)", "portal", "[projectId]", "page.tsx")),
    ).toBe(true);
    expect(routeResolves("/definitely-not-a-route-xyz")).toBe(false);
  });

  it.each(PRODUCERS.map((p) => p.file))(
    "%s redirects into the unauthenticated portal route group, not the staff area",
    (file) => {
      const target = recoveryTargets().find((t) => t.file === file);
      expect(target).toBeDefined();
      const path = target!.url.split("?")[0]!;

      expect(routeResolves(path)).toBe(true);
      expect(
        existsSync(join(APP_DIR, "(portal)", path.replace(/^\//, ""), "page.tsx")),
      ).toBe(true);
      expect(path.startsWith("/portal/")).toBe(false);
    },
  );

  it("the invitation route still handles both reasons the producers send, wherever its views now live", () => {
    const routeDir = join(APP_DIR, "(portal)", "accept-invitation");
    const sources = readdirSync(routeDir)
      .filter((entry) => entry.endsWith(".tsx") || entry.endsWith(".ts"))
      .map((entry) => readFileSync(join(routeDir, entry), "utf8"))
      .join("\n");

    expect(sources.length).toBeGreaterThan(0);
    for (const { reason } of PRODUCERS) {
      expect(sources).toContain(`"${reason}"`);
    }
    expect(sources).not.toContain('"definitely-not-a-reason-xyz"');
  });
});
