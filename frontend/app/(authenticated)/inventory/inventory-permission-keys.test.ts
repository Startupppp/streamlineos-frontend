import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { backendRoot } from "@/test-support/backend-checkout";

/**
 * INV-45 — every key an inventory screen gates on is a key the backend enforces.
 *
 * `useCan(key: PermissionKey)` takes a typed union, and `catalog-sync.test.ts`
 * already holds that union equal to the backend catalogue in both directions. So
 * a misspelled key does not compile, and a frontend-only ghost is caught.
 *
 * Neither of those catches the failure this file is about. A key can be in the
 * catalogue, in the union, and required by **no endpoint at all** — and then a
 * screen gated on it is gated on nothing anybody ever grants for a reason. The
 * two ways that goes wrong are opposite and both silent:
 *
 *   * the gate is stricter than the endpoint, so a user who may call the API is
 *     shown a denied screen and reports the feature as broken;
 *   * the gate is looser, so the screen renders, fires the request and collects
 *     a 403 — the shape `frontend/CLAUDE.md` §2 calls 403-spam.
 *
 * What is checked is the honest half of that: the key a screen gates on must be
 * a key the backend actually guards something with, not merely one that exists.
 * Presence in `modules/rbac/` does not count — that is the catalogue and the
 * role templates, which is exactly the "it exists" that is not the question.
 *
 * A key is allowed to belong to another module: `crm:clients:read` gates the
 * customer picker inside a shelf-life rule, and is enforced in
 * `modules/clients/clients-scope.ts` as a constant rather than a decorator
 * literal — which is why the sweep looks for the quoted key anywhere under
 * `src/modules`, not only inside `@RequirePermission(`. Keys in the
 * `inventory:` namespace are held to the stricter rule that an inventory
 * endpoint requires them.
 */

const FRONTEND_ROOT = join(__dirname, "..", "..", "..");

/** Where an inventory screen may gate. */
const FRONTEND_SCAN_DIRS = [
  join(FRONTEND_ROOT, "app", "(authenticated)", "inventory"),
  join(FRONTEND_ROOT, "features", "inventory"),
  join(FRONTEND_ROOT, "hooks", "api", "inventory"),
];

/**
 * The floor that stops a broken sweep reading as full coverage.
 *
 * A regex that matches nothing reports zero unguarded keys, which is
 * indistinguishable from every key being guarded.
 *
 * 58 distinct keys over 328 gate call sites is what resolving constants finds;
 * the literal-only sweep this replaced saw 53 keys over 259 sites. The key floor
 * sits above 53 deliberately, so dropping constant resolution fails here rather
 * than quietly narrowing the sweep again. The call-site floor is the one that
 * actually measures reach: distinct keys barely moved (five), while a fifth of
 * every gate in the module had never been looked at.
 */
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

/**
 * `SCREAMING_CASE` string constants declared anywhere in the scanned tree.
 *
 * Most inventory gates do not read `useCan("literal")` — they read
 * `useCan(PUTAWAY_READ_KEY)`, and a literal-only sweep cannot see any of them.
 * That is 69 of the 328 gate call sites, and among them are every key the RF
 * putaway and picking flows gate on, so the surfaces most worth checking were
 * the ones this file was blind to.
 *
 * A name that resolves to two different values is recorded as ambiguous rather
 * than resolved to whichever file was walked last, because a sweep that guesses
 * is worse than one that admits the gap.
 */
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
      // Only names a gate actually reads. `ALL`, `FORM_ID` and `SENTINEL` are
      // UI sentinels that legitimately differ per file and never reach useCan.
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

/** Every key passed to `useCan`, with the file that gates on it. */
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

/** Every string literal the backend guards something with, outside the catalogue. */
function backendEnforcedKeys(modulesDir: string): { all: Set<string>; inventory: Set<string> } {
  const all = new Set<string>();
  const inventory = new Set<string>();
  for (const file of walk(modulesDir)) {
    const rel = relative(modulesDir, file);
    // `modules/rbac/` is the catalogue and the role templates — the "it exists"
    // that is precisely not what is being asked here.
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
    // Loud rather than skipped. Five cross-repo guards in this repository once
    // resolved to a path that did not exist and passed by sweeping nothing.
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
