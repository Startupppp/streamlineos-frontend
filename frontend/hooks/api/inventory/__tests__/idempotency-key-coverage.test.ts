import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * T25 — an inventory create must carry a key it chose, not one the fetch layer
 * invented on its way out.
 *
 * `authedFetch` puts an `Idempotency-Key` on every mutating request that does
 * not already have one (`lib/api-client.ts:142-144`). That is load-bearing: it
 * is why the thirty-seven routes fenced by T24 do not answer the web client with
 * a 400, and why frontend issue #27 — Build endpoints rejecting requests whose
 * hooks send no header — does not reproduce here.
 *
 * But it mints a *fresh* key per fetch, and a replay fence keys on the client
 * sending the same key twice. So a per-attempt key means the operator's second
 * press is a different command, and the fence never sees a retry at all. The
 * request is always well-formed, so nothing fails and nothing reports the
 * protection missing — which is exactly why this has to be checked from source
 * rather than waited for.
 *
 * The rule: a hook posting to a fenced route passes an explicit key, which
 * `useIdempotentMutation` scopes to the operator's intent.
 */
const INVENTORY_HOOKS = join(__dirname, "..");

/** The routes T24 fenced with `@Idempotent`, as the hooks write their paths. */
const FENCED = [
  /^\/inventory\/products$/,
  /^\/inventory\/products\/categories$/,
  /^\/inventory\/products\/uom$/,
  /^\/inventory\/products\/\$\{[^}]+\}\/variants$/,
  /^\/inventory\/warehouses$/,
  /^\/inventory\/warehouses\/\$\{[^}]+\}\/locations$/,
  /^\/inventory\/vendors$/,
  /^\/inventory\/sales-orders$/,
  /^\/inventory\/sales-orders\/\$\{[^}]+\}\/invoice$/,
  /^\/inventory\/shipments$/,
  /^\/inventory\/carriers$/,
  /^\/inventory\/loads$/,
  /^\/inventory\/packages$/,
  /^\/inventory\/webhooks$/,
  /^\/inventory\/channels$/,
  /^\/inventory\/3pl\/connections$/,
  /^\/inventory\/quick-commerce\/payouts$/,
  /^\/inventory\/cycle-counts$/,
  /^\/inventory\/physical-audits$/,
  /^\/inventory\/customer-returns$/,
  /^\/inventory\/vendor-returns$/,
  /^\/inventory\/dock\/appointments$/,
  /^\/inventory\/dock\/doors$/,
  /^\/inventory\/picking\/waves$/,
  /^\/inventory\/putaway\/tasks$/,
  /^\/inventory\/slotting\/rules$/,
  /^\/inventory\/replenishment\/rules$/,
  /^\/inventory\/quality\/inspections$/,
  /^\/inventory\/quality\/inspection-plans$/,
  /^\/inventory\/import\/jobs$/,
  /^\/inventory\/import\/staged$/,
  /^\/inventory\/export\/jobs$/,
  /^\/inventory\/audit-export\/jobs$/,
  /^\/inventory\/ai\/feedback$/,
];

interface Site {
  file: string;
  hook: string;
  path: string;
  carriesKey: boolean;
}

/** The end of an `apiClient.post(` argument list, skipping over string literals. */
function balancedEnd(source: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const c = source[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return i;
    } else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i++;
        i++;
      }
    }
  }
  return -1;
}

function postsToFencedRoutes(): Site[] {
  const out: Site[] = [];
  for (const entry of readdirSync(INVENTORY_HOOKS)) {
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
    const source = readFileSync(join(INVENTORY_HOOKS, entry), "utf8");

    for (const m of source.matchAll(/apiClient\.post(?:<[^>]*>)?\(\s*[`"]([^`"]+)[`"]/g)) {
      const path = m[1] ?? "";
      if (!FENCED.some((r) => r.test(path))) continue;

      const openIdx = source.indexOf("(", m.index);
      const closeIdx = balancedEnd(source, openIdx);
      const args = closeIdx === -1 ? "" : source.slice(openIdx, closeIdx);
      const hook =
        [...source.slice(0, m.index).matchAll(/export function (use[A-Za-z0-9_]+)/g)].pop()?.[1] ??
        "unknown";

      out.push({ file: entry, hook, path, carriesKey: args.includes("Idempotency-Key") });
    }
  }
  return out;
}

const sites = postsToFencedRoutes();

describe("inventory mutations carry a key scoped to the operator's intent", () => {
  it("walks the hooks, so a broken walk cannot pass as zero violations", () => {
    // Every assertion below filters `sites`. A walk that matched nothing would
    // report an empty violation list and read as a pass — the shape of the six
    // vacuous gates this programme has already found.
    expect(sites.length).toBeGreaterThan(20);
    expect(new Set(sites.map((s) => s.file)).size).toBeGreaterThan(10);
    expect(sites.filter((s) => s.hook === "unknown")).toEqual([]);
  });

  it("never leaves a fenced create relying on the per-attempt key api-client mints", () => {
    const relying = sites
      .filter((s) => !s.carriesKey)
      .map((s) => `${s.file}::${s.hook} -> POST ${s.path}`);

    expect(relying).toEqual([]);
  });

  it("routes every one of them through useIdempotentMutation", () => {
    // Passing a key is not enough on its own: a key minted inside the mutationFn
    // would be per-attempt again, and would satisfy the assertion above while
    // changing nothing. The key has to come from the hook that owns the intent.
    const files = new Set(sites.map((s) => s.file));
    const notUsingTheHook = [...files].filter(
      (f) => !readFileSync(join(INVENTORY_HOOKS, f), "utf8").includes("useIdempotentMutation"),
    );

    expect(notUsingTheHook).toEqual([]);
  });
});
