import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP_DIR = join(process.cwd(), "app");

const CONFIG_SOURCE = readFileSync(
  join(process.cwd(), "next.config.ts"),
  "utf8",
);

function declaredRedirectSources(configSource: string): string[] {
  return [...configSource.matchAll(/source:\s*"([^"]+)"/g)].map(
    (match) => match[1] ?? "",
  );
}

function isGroupOrSlot(segment: string): boolean {
  return (
    (segment.startsWith("(") && segment.endsWith(")")) || segment.startsWith("@")
  );
}

function routePathOf(pageFile: string): string {
  const segments = relative(APP_DIR, pageFile)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !isGroupOrSlot(segment));
  return `/${segments.join("/")}`;
}

function collectPageFiles(dir: string, found: string[]): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectPageFiles(full, found);
    else if (entry === "page.tsx") found.push(full);
  }
  return found;
}

function routesServedByARedirectPage(): string[] {
  return collectPageFiles(APP_DIR, [])
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        source.includes('from "next/navigation"') && source.includes("redirect(")
      );
    })
    .map(routePathOf);
}

function shadowedRoutes(
  redirectPageRoutes: readonly string[],
  configRedirectSources: readonly string[],
): string[] {
  const sources = new Set(configRedirectSources);
  return redirectPageRoutes.filter((route) => sources.has(route));
}

describe("route-level redirect pages are not shadowed by next.config.ts (S20)", () => {
  it("finds both the redirect table and the redirect pages, so an empty scan cannot pass this suite vacuously", () => {
    expect(declaredRedirectSources(CONFIG_SOURCE).length).toBeGreaterThan(10);
    expect(routesServedByARedirectPage()).toEqual(
      expect.arrayContaining(["/knowledge", "/kb"]),
    );
  });

  it("BITE: the detector reports a route whose page redirects and whose path is also a config redirect source", () => {
    expect(shadowedRoutes(["/knowledge", "/kb"], ["/knowledge"])).toEqual([
      "/knowledge",
    ]);
  });

  it("no redirect page in the app router is dead behind a config-level redirect", () => {
    expect(
      shadowedRoutes(
        routesServedByARedirectPage(),
        declaredRedirectSources(CONFIG_SOURCE),
      ),
    ).toEqual([]);
  });

  it("the knowledge aliases are served by their page files, not by next.config.ts", () => {
    const sources = declaredRedirectSources(CONFIG_SOURCE);
    expect(sources).not.toContain("/knowledge");
    expect(sources).not.toContain("/kb");
    expect(sources).toContain("/ask");
  });
});
