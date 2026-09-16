import KNOWN_SURFACES from "./denial-is-not-emptiness.known.json";
import fs from "node:fs";
import path from "node:path";

/**
 * Phase 2, ticket 26 — a surface may not tell a denied user their data is empty.
 *
 * Every gated read hook in this codebase disables itself when the caller lacks
 * the permission:
 *
 *     const canView = useCan("crm:campaigns:view");
 *     return useQuery({ ..., enabled: canView });
 *
 * In TanStack Query v5 a **disabled** query reports `isPending: true,
 * isFetching: false`, and `isLoading` is `isPending && isFetching` — so
 * `isLoading` is **false**. Those are the same flags an empty list has. A screen
 * branching `isLoading ? skeleton : rows.length === 0 ? empty : list` therefore
 * lands on the empty branch and tells somebody **"No campaigns yet"** when the
 * truth is **"you are not allowed to see this"**.
 *
 * That is worse than an unexplained failure: the product **asserts something
 * false about the customer's data**. A rep who cannot see the pipeline is told
 * the pipeline is empty, and their next action is to re-create something that
 * already exists.
 *
 * It is invisible to everyone able to fix it. An owner or an admin holds every
 * permission and will never once see it.
 *
 * ## Why this is a ratchet and not a pass/fail
 *
 * The ticket estimated 82 hooks across 21 files, in the CRM. Measured, it is
 * **365 surfaces across every module in the platform** — HR, build, inventory
 * and payroll each have more of it than the CRM does. It was never a CRM bug;
 * the CRM is only where somebody noticed.
 *
 * A list that large cannot be converted in one change, and a test that failed on
 * all of it would be switched off within a day. So this freezes the list and
 * allows it only to shrink. The value is the other direction: a surface **not**
 * on the list that reads a gated hook and renders an empty state fails the
 * build. The bug stops growing today and shrinks from here.
 *
 * Fixing one means wrapping its states in `<Gated>` (`components/shared/gated.tsx`),
 * which owns the branch order, and deleting its line below. `crm/issues` is the
 * worked example.
 */

const ROOT = path.join(__dirname, "..", "..");

/**
 * Surfaces that could still show a denied caller an empty state.
 *
 * **This list may only shrink.** Delete a line when you convert its surface;
 * never add one. A new entry means a new instance of a bug we have already
 * decided is unacceptable.
 */
/*
 * Paths updated 2026-08-27, when `crm/phases-complete` merged in: it renamed
 * `features/knowledge-base/components/` to `features/wiki/components/` and moved
 * `kb-content-gaps` into `features/help-centre/`. Twenty entries here are those
 * same surfaces at their new paths -- the debt did not grow, it moved. Two came
 * off because they genuinely no longer have the problem.
 */
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

/**
 * Read hooks whose query is disabled by a permission.
 *
 * Collected from source rather than listed, because the set changes with every
 * new hook and a stale list would silently stop watching whatever was added
 * last. A hook qualifies when a `useCan` result decides its `enabled` — that is
 * precisely the shape that turns a refusal into an empty result.
 */
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

/** Does this file assert to a person that there is nothing here? */
function claimsEmptiness(source: string): boolean {
  return /EmptyState|No .{0,30} yet|isEmpty/.test(source);
}

/**
 * There are two ways to state a refusal here, not one, and this only knew about
 * the first.
 *
 * `<Gated>` was the second of them, since folded into `<PageState
 * resolution={usePageState(...)}>` (components/shared/page-state.tsx), which
 * resolves "denied" ahead of "empty" the same way `resolveGate` did. The
 * oldest is `usePermissionGate` plus `<EmptyState access={gate}>`:
 * `EmptyState` returns `NoPermissionState` when `access.denied`, and the gate
 * keeps "denied" apart from "not known yet" the same way `resolveGate` does.
 * All three are the same fix, reached through a different component, and a
 * surface using any of them does not have this bug.
 *
 * Recognising only `<Gated>` reported two already-correct files as broken —
 * `timesheets/approvals` (which was even listed below as unconverted, though it
 * had been converted) and `timesheets/exceptions`. A ratchet that names a fixed
 * file is a ratchet people learn to disbelieve, so it must know all three.
 *
 * Note what this deliberately does NOT accept: a page-level server
 * `requirePermission()`. That does keep a denied user off the page, but it is a
 * property of a route the component knows nothing about, and a second caller
 * mounting the same component elsewhere would silently lose it.
 */
function handlesDenial(source: string): boolean {
  if (source.includes("NoPermissionState")) return true;
  if (/<Gated\b/.test(source)) return true;
  if (/<PageState\b/.test(source)) return true;
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

    // Named rather than counted, so a failure says which file to look at.
    // Wrap its states in `<Gated>`; see `crm/issues/issues-page.tsx`.
    expect(added).toEqual([]);
  });

  /**
   * The other direction, so the list cannot rot into an allowlist.
   *
   * An entry for a surface that has since been converted — or deleted, which the
   * renderer migration does constantly — would quietly excuse the next thing
   * added at that path.
   */
  it("keeps no entry for a surface that no longer has the problem", () => {
    const still = new Set(measured);
    const stale = NOT_YET_CONVERTED.filter((file) => !still.has(file));

    expect(stale).toEqual([]);
  });
});

/**
 * The other half of ticket 26, which the ratchet above cannot see.
 *
 * `surfacesTellingDeniedUsersTheyAreEmpty` only asks whether a surface
 * *handles* denial at all -- `source.includes("NoPermissionState")` is true
 * whether the key inside it is right or not. The deals list regressed exactly
 * that way: `deal-list.tsx` checked `useCanState("crm:leads:view")` while its
 * data (`useDeals`) is gated on `crm:deals:read`. A near-universal permission
 * stood in for the real one, so the guard always read "granted" and a caller
 * who could not read deals saw "No deals yet" instead of "Access Restricted".
 *
 * A fully general version of this check would need to know, for an arbitrary
 * component, which gated hook's result it is rendering -- not always answerable
 * from source text alone, since the fetch can live in a parent (deal-list.tsx
 * itself never calls `useDeals`; `app/(authenticated)/crm/deals/page.tsx`
 * does, and passes rows down). Rather than guess, this pins the one pair the
 * regression was in: the permission key is read out of `useDeals`'s own
 * definition, not retyped here, so a future rename of that key still has to
 * agree with every denial check below it or this fails.
 */
function permissionKeyForGatedHook(relativeFile: string, hookName: string): string | null {
  const source = fs.readFileSync(path.join(ROOT, relativeFile), "utf8");
  const start = source.search(new RegExp(`export function ${hookName}\\b`));
  if (start === -1) return null;
  const body = source.slice(start, start + 2000);
  const match = body.match(/useGatedQuery(?:<[^>]*>)?\(\s*["']([^"']+)["']/);
  return match?.[1] ?? null;
}

function deniedPermissionKeys(source: string): string[] {
  return [...source.matchAll(/useCanState\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] as string);
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
