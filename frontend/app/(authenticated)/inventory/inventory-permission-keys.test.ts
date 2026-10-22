import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { backendRoot } from "@/test-support/backend-checkout";


const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

const FRONTEND_SCAN_DIRS = [
  join(FRONTEND_ROOT, "app", "(authenticated)", "inventory"),
  join(FRONTEND_ROOT, "features", "inventory"),
  join(FRONTEND_ROOT, "hooks", "api", "inventory"),
];

const MIN_GATED_KEYS = 55;
const MIN_GATE_SITES = 300;

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

function constantValues(
  files: string[],
  wanted: Set<string>,
): {
  values: Map<string, string>;
  ambiguous: string[];
} {
  const seen = new Map<string, Set<string>>();
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const declaration =
      /(?:const|let)\s+([A-Z][A-Z0-9_]*)\s*(?::\s*[A-Za-z<>[\]" |]+)?=\s*["']([a-z0-9:_-]+)["']/g;
    for (const match of source.matchAll(declaration)) {
      const [, name, value] = match;
      if (name === undefined || value === undefined) continue;
      if (!wanted.has(name)) continue;
      const existing = seen.get(name);
      if (existing) existing.add(value);
      else seen.set(name, new Set([value]));
    }
  }
  const values = new Map<string, string>();
  const ambiguous: string[] = [];
  for (const [name, candidates] of seen) {
    const [only] = [...candidates];
    if (candidates.size === 1 && only !== undefined) values.set(name, only);
    else ambiguous.push(`${name} (${[...candidates].join(" | ")})`);
  }
  return { values, ambiguous };
}

function gatedKeys(): {
  keys: Map<string, string[]>;
  sites: number;
  ambiguous: string[];
  unresolved: string[];
} {
  const files = FRONTEND_SCAN_DIRS.flatMap((dir) => walk(dir));
  const gate = /useCan\(\s*(["'][^"']+["']|[A-Z][A-Z0-9_]*)\s*\)/g;
  const identifiers = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(gate)) {
      const argument = match[1];
      if (argument !== undefined && !/^["']/.test(argument)) identifiers.add(argument);
    }
  }
  const { values, ambiguous } = constantValues(files, identifiers);
  const keys = new Map<string, string[]>();
  const unresolved: string[] = [];
  let sites = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const where = relative(FRONTEND_ROOT, file);
    for (const match of source.matchAll(gate)) {
      const argument = match[1];
      if (argument === undefined) continue;
      sites += 1;
      const quoted = /^["']/.test(argument);
      const key = quoted ? argument.slice(1, -1) : values.get(argument);
      if (key === undefined) {
        unresolved.push(`${argument} (gated in ${where})`);
        continue;
      }
      const existing = keys.get(key);
      if (existing) existing.push(where);
      else keys.set(key, [where]);
    }
  }
  return { keys, sites, ambiguous, unresolved };
}

function backendEnforcedKeys(modulesDir: string): { all: Set<string>; inventory: Set<string> } {
  const all = new Set<string>();
  const inventory = new Set<string>();
  for (const file of walk(modulesDir)) {
    const rel = relative(modulesDir, file);
    if (rel.startsWith(`rbac${sep}`)) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/["']([a-z0-9-]+(?::[a-z0-9-]+){1,3})["']/g)) {
      const key = match[1];
      if (key === undefined) continue;
      all.add(key);
      if (rel.startsWith(`inventory${sep}`)) inventory.add(key);
    }
  }
  return { all, inventory };
}

const backend = backendRoot();

describe("inventory permission keys", () => {
  const { keys, sites, ambiguous, unresolved } = gatedKeys();

  it("finds the gates at all", () => {
    expect(keys.size).toBeGreaterThanOrEqual(MIN_GATED_KEYS);
  });

  it("looks at every gate call site, not only the ones written as literals", () => {
    expect(sites).toBeGreaterThanOrEqual(MIN_GATE_SITES);
  });

  it("resolves every constant-valued gate", () => {
    expect(unresolved).toEqual([]);
  });

  it("has no constant name standing for two different keys", () => {
    expect(ambiguous).toEqual([]);
  });

  it("has a backend checkout to compare against", () => {
    expect(backend).not.toBeNull();
  });

  it("gates only on keys the backend enforces somewhere", () => {
    if (backend === null) return;
    const enforced = backendEnforcedKeys(join(backend, "src", "modules"));
    const unenforced = [...keys.entries()]
      .filter(([key]) => !enforced.all.has(key))
      .map(([key, files]) => `${key} (gated in ${files[0]})`);
    expect(unenforced).toEqual([]);
  });

  it("gates an inventory key on an inventory endpoint, not merely on the catalogue", () => {
    if (backend === null) return;
    const enforced = backendEnforcedKeys(join(backend, "src", "modules"));
    const strays = [...keys.entries()]
      .filter(([key]) => key.startsWith("inventory:"))
      .filter(([key]) => !enforced.inventory.has(key))
      .map(([key, files]) => `${key} (gated in ${files[0]})`);
    expect(strays).toEqual([]);
  });
});
