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
 * indistinguishable from every key being guarded. 53 is what was found when this
 * was written; the floor sits below it so keys may be added and the sweep may
 * not quietly stop finding them.
 */
const MIN_GATED_KEYS = 40;

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

/** Every key passed to `useCan`, with the file that gates on it. */
function gatedKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const dir of FRONTEND_SCAN_DIRS) {
    for (const file of walk(dir)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/useCan\(\s*["']([^"']+)["']\s*\)/g)) {
        const key = match[1];
        if (key === undefined) continue;
        const where = relative(FRONTEND_ROOT, file);
        const existing = found.get(key);
        if (existing) existing.push(where);
        else found.set(key, [where]);
      }
    }
  }
  return found;
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
  const keys = gatedKeys();

  it("finds the gates at all", () => {
    expect(keys.size).toBeGreaterThanOrEqual(MIN_GATED_KEYS);
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
