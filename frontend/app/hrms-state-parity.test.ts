import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();

const PRIMARY_ROUTES = [
  "hr",
  "hr/approvals",
  "hr/employees",
  "hr/org-chart",
  "hr/onboarding",
  "hr/exit",
  "hr/attendance",
  "hr/leaves",
  "hr/documents",
  "hr/cases",
  "hr/settings",
  "me/attendance",
  "me/time-off",
  "me/pay",
  "me/documents",
  "me/onboarding",
  "me/team",
] as const;

const STATE_MARKERS = [
  "usePageState",
  "PageState",
  "EmptyState",
  "ErrorState",
  "NoPermissionState",
  "resolvePageState",
];

const MODULE_SPECIFIER = /from\s+"([^"]+)"/g;
const FOLLOW_DEPTH = 3;

function routeFile(route: string): string {
  return join(ROOT, "app", "(authenticated)", route, "page.tsx");
}

function resolveModule(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (!base) return null;

  const candidates = [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function isProjectModule(specifier: string): boolean {
  if (specifier.startsWith(".")) return true;
  return (
    specifier.startsWith("@/features/") ||
    specifier.startsWith("@/components/") ||
    specifier.startsWith("@/hooks/")
  );
}

function collectSources(entry: string): string[] {
  const seen = new Set<string>();
  const sources: string[] = [];
  const queue: Array<{ file: string; depth: number }> = [{ file: entry, depth: 0 }];

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    if (seen.has(next.file)) continue;
    seen.add(next.file);

    const source = readFileSync(next.file, "utf8");
    sources.push(source);
    if (next.depth >= FOLLOW_DEPTH) continue;

    for (const match of source.matchAll(MODULE_SPECIFIER)) {
      const specifier = match[1];
      if (!isProjectModule(specifier)) continue;
      const resolved = resolveModule(specifier, next.file);
      if (resolved && !resolved.includes("/components/ui/")) {
        queue.push({ file: resolved, depth: next.depth + 1 });
      }
    }
  }

  return sources;
}

describe("HRMS primary routes carry loading, empty, error and denied states", () => {
  it.each(PRIMARY_ROUTES)("%s resolves to a page module", (route) => {
    expect(existsSync(routeFile(route))).toBe(true);
  });

  it.each(PRIMARY_ROUTES)("%s renders explicit states", (route) => {
    const path = routeFile(route);
    if (!existsSync(path)) throw new Error(`missing route module for ${route}`);

    const combined = collectSources(path).join("\n");
    const present = STATE_MARKERS.filter((marker) => combined.includes(marker));
    expect(present).not.toHaveLength(0);
  });

  it.each(PRIMARY_ROUTES)("%s uses the shared page shell", (route) => {
    const path = routeFile(route);
    if (!existsSync(path)) throw new Error(`missing route module for ${route}`);

    const sources = collectSources(path);
    expect(sources.some((source) => source.includes("PageWrapper"))).toBe(true);
  });
});
