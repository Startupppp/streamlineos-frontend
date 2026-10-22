import KNOWN_SURFACES from "./denial-is-not-emptiness.known.json";
import fs from "node:fs";
import path from "node:path";


const ROOT = path.join(__dirname, "..", "..");

const NOT_YET_CONVERTED: readonly string[] = KNOWN_SURFACES;

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name.endsWith(".tsx") && !entry.name.includes(".test.")) found.push(full);
  }
  return found;
}

function gatedReadHooks(): Set<string> {
  const hooks = new Set<string>();
  const dir = path.join(ROOT, "hooks");

  for (const file of walk(dir).concat(
    fs
      .readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.includes(".test."))
      .map((e) => path.join(e.parentPath ?? e.path, e.name)),
  )) {
    const source = fs.readFileSync(file, "utf8");
    const starts = [...source.matchAll(/^export (?:function|const) (use[A-Za-z0-9_]+)/gm)];

    starts.forEach((match, index) => {
      const from = match.index ?? 0;
      const to = index + 1 < starts.length ? (starts[index + 1]?.index ?? source.length) : source.length;
      const body = source.slice(from, to);
      if (!body.includes("useQuery")) return;
      if (!/useCan\(\s*["'][^"']+["']/.test(body)) return;
      if (!/enabled:\s*[^,\n]*can/i.test(body)) return;
      hooks.add(match[1] as string);
    });
  }

  return hooks;
}

function claimsEmptiness(source: string): boolean {
  return /EmptyState|No .{0,30} yet|isEmpty/.test(source);
}

function permissionResolvingComponents(): string[] {
  const names: string[] = [];
  for (const base of ["components", "features"]) {
    for (const file of walk(path.join(ROOT, base))) {
      const source = fs.readFileSync(file, "utf8");
      if (!/<PageState\b/.test(source)) continue;
      if (!/usePageState\(\{\s*permission\s*,/.test(source)) continue;
      for (const match of source.matchAll(
        /^export function ([A-Z][A-Za-z0-9]*)\s*(?:<[^>(]*>)?\(\s*\{[^}]*\bpermission\s*,/gm,
      )) {
        names.push(match[1] as string);
      }
    }
  }
  return names;
}

const PERMISSION_RESOLVING_COMPONENTS = permissionResolvingComponents();

function openingTagProps(source: string, from: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (depth === 0 && (char === '"' || char === "'")) quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    else if (char === ">" && depth === 0) return source.slice(from, index);
  }
  return source.slice(from);
}

function rendersPermissionResolvingComponent(
  source: string,
  components: readonly string[],
): boolean {
  return components.some((name) =>
    [...source.matchAll(new RegExp(`<${name}\\b(?:<[^<>]*>)?`, "g"))].some((match) =>
      /\bpermission=/.test(openingTagProps(source, (match.index ?? 0) + match[0].length)),
    ),
  );
}

function handlesDenial(
  source: string,
  components: readonly string[] = PERMISSION_RESOLVING_COMPONENTS,
): boolean {
  if (source.includes("NoPermissionState")) return true;
  if (rendersPermissionResolvingComponent(source, components)) return true;
  if (/<PageState\b/.test(source)) return true;
  if (/usePageState\(/.test(source)) return true;
  if (/useCanState\(/.test(source) && /["']denied["']/.test(source)) return true;
  return /usePermissionGate\(/.test(source) && /\baccess=\{/.test(source);
}

function surfacesTellingDeniedUsersTheyAreEmpty(): string[] {
  const hooks = [...gatedReadHooks()];
  const found: string[] = [];

  for (const base of ["app", "features", "components"]) {
    for (const file of walk(path.join(ROOT, base))) {
      const source = fs.readFileSync(file, "utf8");
      if (!hooks.some((hook) => new RegExp(`\\b${hook}\\b\\s*\\(`).test(source))) continue;
      if (!claimsEmptiness(source)) continue;
      if (handlesDenial(source)) continue;
      found.push(path.relative(ROOT, file).split(path.sep).join("/"));
    }
  }

  return found.sort();
}

describe("no surface tells a denied user their data is empty", () => {
  const measured = surfacesTellingDeniedUsersTheyAreEmpty();

  it("adds none that is not already known about", () => {
    const known = new Set(NOT_YET_CONVERTED);
    const added = measured.filter((file) => !known.has(file));

    expect(added).toEqual([]);
  });

  it("keeps no entry for a surface that no longer has the problem", () => {
    const still = new Set(measured);
    const stale = NOT_YET_CONVERTED.filter((file) => !still.has(file));

    expect(stale).toEqual([]);
  });
});

function permissionKeyForGatedHook(relativeFile: string, hookName: string): string | null {
  const source = fs.readFileSync(path.join(ROOT, relativeFile), "utf8");
  const start = source.search(new RegExp(`export function ${hookName}\\b`));
  if (start === -1) return null;
  const body = source.slice(start, start + 2000);
  const match = body.match(/useGatedQuery(?:<[^>]*>)?\(\s*["']([^"']+)["']/);
  return match?.[1] ?? null;
}

function deniedPermissionKeys(source: string): string[] {
  const canStateKeys = [...source.matchAll(/useCanState\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] as string);
  const pageStateKeys = [...source.matchAll(/usePageState\s*\(\s*\{[^}]*permission\s*:\s*["']([^"']+)["']/g)].map((m) => m[1] as string);
  return [...canStateKeys, ...pageStateKeys];
}

describe("the deals list denies on the permission that actually gates its data", () => {
  const dealsReadKey = permissionKeyForGatedHook("hooks/api/crm/deals.ts", "useDeals");

  it("finds useDeals' own gate key to check against", () => {
    expect(dealsReadKey).not.toBeNull();
  });

  it("deal-list.tsx's table-view denial check uses it", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "features/crm/deals/deal-list.tsx"),
      "utf8",
    );
    expect(deniedPermissionKeys(source)).toContain(dealsReadKey);
  });

  it("the deals page's kanban-view denial check uses it too", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "app/(authenticated)/crm/deals/page.tsx"),
      "utf8",
    );
    expect(deniedPermissionKeys(source)).toContain(dealsReadKey);
  });
});

describe("a shared surface that resolves its own permission prop through PageState is a refusal", () => {
  it("derives BuildListSurface from source as one, because it calls usePageState with the permission it is given and renders PageState", () => {
    expect(PERMISSION_RESOLVING_COMPONENTS).toContain("BuildListSurface");
  });

  it("accepts a page that renders that surface with the permission its rows are gated on", () => {
    const source = `
      const { data } = useReleases(projectId);
      <BuildListSurface<Release>
        rows={data ?? []}
        onRowClick={(row) => open(row.id)}
        permission="build:view"
        empty={<EmptyState title="No releases yet" />}
      />
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source, ["BuildListSurface"])).toBe(true);
  });

  it("still reports a page whose permission prop sits on some other element than the resolving surface", () => {
    const source = `
      const { data } = useReleases(projectId);
      <BuildListSurface<Release> rows={data ?? []} empty={<EmptyState title="No releases yet" />} />
      <AccessHint permission="build:view" />
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source, ["BuildListSurface"])).toBe(false);
  });

  it("still reports a page that renders a component which does not resolve a permission", () => {
    const source = `
      const { data } = useReleases(projectId);
      <DataTable permission="build:view" data={data ?? []} />
      <EmptyState title="No releases yet" />
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source, ["BuildListSurface"])).toBe(false);
  });
});

describe("an explicit useCanState denied branch is a refusal, whatever it renders", () => {
  it("accepts a disabled control whose placeholder reads Access restricted, because an inline form field states its refusal in place rather than replacing the form with a permission wall", () => {
    const source = `
      const categoriesState = useCanState("inventory:products:read");
      <Select disabled={categoriesState !== "granted"}>
        <SelectValue placeholder={categoriesState === "denied" ? "Access restricted" : "Select category"} />
      </Select>
      <EmptyState title="No categories yet" />
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source)).toBe(true);
  });

  it("accepts a nested panel that renders nothing when denied, because hiding an unauthorised export control is what the navigation rules require of a mutation control", () => {
    const source = `
      const canExportState = useCanState("inventory:audit:export");
      if (canExportState === "denied") return null;
      return <EmptyState title="No evidence has been exported yet" />;
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source)).toBe(true);
  });

  it("still reports a surface that reads a gated hook and claims emptiness without ever naming the denied state", () => {
    const source = `
      const { data } = useAuditExportJobs({ limit: 20 });
      if (!data?.length) return <EmptyState title="No evidence has been exported yet" />;
    `;
    expect(claimsEmptiness(source)).toBe(true);
    expect(handlesDenial(source)).toBe(false);
  });
});
