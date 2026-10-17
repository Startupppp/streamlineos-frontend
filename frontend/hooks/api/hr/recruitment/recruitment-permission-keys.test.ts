import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const SCANNED_ROOTS = [
  "hooks/api/hr/recruitment",
  "features/recruitment",
  "app/(authenticated)/recruitment",
  "components/hr/recruitment",
];

const GATE_SITE =
  /(?:useGatedQuery|useAuthorizedMutation|useAuthorizedIdempotentMutation|useCan|usePermissionGate|requirePermission|permission:)\s*[(:]?\s*"([a-z][a-z0-9:-]*)"/g;

interface GateSite {
  readonly key: string;
  readonly file: string;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) {
      out.push(...sourceFiles(rel));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (entry.includes(".test.")) continue;
    out.push(rel);
  }
  return out;
}

function gateSites(): GateSite[] {
  const sites: GateSite[] = [];
  for (const root of SCANNED_ROOTS) {
    for (const file of sourceFiles(root)) {
      const source = readFileSync(join(ROOT, file), "utf8");
      for (const match of source.matchAll(GATE_SITE)) {
        sites.push({ key: match[1], file });
      }
    }
  }
  return sites;
}

function declaredRecruitmentPermissions(): Set<string> {
  const contract: unknown = JSON.parse(
    readFileSync(join(ROOT, "contracts/openapi.json"), "utf8"),
  );
  const paths =
    typeof contract === "object" && contract !== null && "paths" in contract
      ? (contract as { paths: Record<string, Record<string, unknown>> }).paths
      : {};
  const declared = new Set<string>();
  for (const [path, operations] of Object.entries(paths)) {
    if (!path.startsWith("/hr/recruitment")) continue;
    for (const operation of Object.values(operations)) {
      if (typeof operation !== "object" || operation === null) continue;
      const permission = (operation as { "x-permission"?: unknown })["x-permission"];
      if (typeof permission === "string") declared.add(permission);
    }
  }
  return declared;
}

const sites = gateSites();

describe("HRMS-B2-012 recruitment surfaces gate on the key their own routes declare", () => {
  it("finds the recruitment gate sites it claims to audit, so the assertions below cannot pass vacuously", () => {
    expect(sites.length).toBeGreaterThanOrEqual(190);
    expect(new Set(sites.map((site) => site.file)).size).toBeGreaterThanOrEqual(60);
  });

  it("gates no recruitment surface on an hr:employees key, which the backend never enforces on /hr/recruitment", () => {
    const employeeScoped = sites.filter((site) => site.key.startsWith("hr:employees:"));

    expect(employeeScoped).toEqual([]);
  });

  it("uses only keys that a /hr/recruitment operation declares, because a key the catalog lacks makes useCan false for ever", () => {
    const declared = declaredRecruitmentPermissions();
    const undeclared = sites.filter((site) => !declared.has(site.key));

    expect(undeclared).toEqual([]);
  });
});
