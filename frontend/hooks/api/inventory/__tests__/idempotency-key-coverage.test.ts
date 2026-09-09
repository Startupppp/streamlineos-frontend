import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { backendPath } from "@/test-support/backend-checkout";

/**
 * INV-12 — an inventory command must carry a key it chose, not one the fetch
 * layer invented on its way out.
 *
 * `authedFetch` puts an `Idempotency-Key` on every mutating request that does
 * not already have one (`lib/api-client.ts`). That is load-bearing: it is why
 * fenced routes do not answer the web client with a 400. But it mints a *fresh*
 * key per fetch, and a replay fence keys on the client sending the same key
 * twice. So a per-attempt key means the operator's second press is a different
 * command, and the fence never sees a retry at all. The request is always
 * well-formed, so nothing fails and nothing reports the protection missing.
 *
 * The rule: a hook calling a fenced route passes an explicit key, which
 * `useIdempotentMutation` scopes to the operator's intent.
 *
 * ## Why this reads the backend
 *
 * The first version of this file carried the fenced route set as a literal
 * list, transcribed once from the backend. That list named thirty-four routes.
 * The backend fences a hundred and thirty-seven, by two mechanisms — the
 * `@Idempotent()` route decorator and an `@IdempotencyKey()` handler parameter
 * feeding a service-side `runIdempotent`. Both are real replay protection, and
 * only the first was ever transcribed.
 *
 * A gate whose target set is a copy goes stale in one direction only: silently,
 * and towards passing. This one derives the set from the backend the frontend
 * is actually paired with, so a route fenced tomorrow is covered tomorrow.
 *
 * It also resolves path constants. The previous matcher required the path to be
 * a literal in the `apiClient.post(` call, so `apiClient.post(BASE, …)` — the
 * shape used by the inspection-plan create, a fenced route — was invisible to
 * it and reported nothing.
 */

const BACKEND_INVENTORY = backendPath("src/modules/inventory");
const FRONTEND_INVENTORY_HOOKS = join(__dirname, "..");
/** `hooks/api/inv-ai-explain.ts` calls inventory routes from outside the folder. */
const FRONTEND_API_HOOKS = join(__dirname, "..", "..");

const MUTATING_VERBS = ["post", "patch", "put", "delete"] as const;

interface FencedRoute {
  method: string;
  segments: string[];
  mechanism: string;
  file: string;
}

interface CallSite {
  file: string;
  method: string;
  path: string;
  segments: string[];
  carriesKey: boolean;
  viaConstant: boolean;
  keyOutlivesTheAttempt: boolean;
}

function walk(dir: string, match: (name: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, match, out);
    else if (match(entry)) out.push(full);
  }
  return out;
}

/** The index of the `)` closing the `(` at `open`, skipping string literals. */
function balancedEnd(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
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

/** Past a leading type-argument list, so `post<{ a: string }>(` still parses. */
function skipTypeArguments(source: string, from: number): number {
  let i = from;
  while (i < source.length && /\s/.test(source[i] ?? "")) i++;
  if (source[i] !== "<") return i;
  let angle = 0;
  let brace = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === "<") angle++;
    else if (c === ">") {
      angle--;
      if (angle === 0 && brace === 0) {
        i++;
        break;
      }
    } else if (c === "{") brace++;
    else if (c === "}") brace--;
    i++;
  }
  while (i < source.length && /\s/.test(source[i] ?? "")) i++;
  return i;
}

function readFencedRoutes(): FencedRoute[] {
  if (BACKEND_INVENTORY === null) return [];
  const routes: FencedRoute[] = [];
  for (const file of walk(BACKEND_INVENTORY, (n) => n.endsWith(".controller.ts"))) {
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");
    const controller = source.match(/@Controller\(\s*(?:"([^"]*)"|'([^']*)')?\s*\)/);
    const prefix = controller?.[1] ?? controller?.[2] ?? "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      let method: string | null = null;
      let sub = "";
      for (const verb of ["Get", "Post", "Patch", "Put", "Delete"]) {
        const m = line.match(new RegExp(`@${verb}\\(\\s*(?:"([^"]*)"|'([^']*)')?\\s*\\)`));
        if (!m) continue;
        method = verb.toUpperCase();
        sub = m[1] ?? m[2] ?? "";
        break;
      }
      if (method === null) continue;

      let mechanism: string | null = null;
      let cursor = i + 1;
      for (; cursor < lines.length; cursor++) {
        const text = (lines[cursor] ?? "").trim();
        if (text === "") continue;
        if (!text.startsWith("@")) break;
        if (/@Idempotent\(/.test(text)) mechanism = "@Idempotent";
      }
      if (mechanism === null) {
        let depth = 0;
        let started = false;
        for (let k = cursor; k < lines.length && k < cursor + 40; k++) {
          for (const c of lines[k] ?? "") {
            if (c === "(") {
              depth++;
              started = true;
            } else if (c === ")") depth--;
          }
          if (/@IdempotencyKey\(\)/.test(lines[k] ?? "")) mechanism = "@IdempotencyKey";
          if (started && depth === 0) break;
        }
      }
      if (mechanism === null) continue;

      const full = `/${[prefix, sub].filter(Boolean).join("/")}`.replace(/\/+/g, "/");
      routes.push({
        method,
        segments: full.split("/").filter(Boolean),
        mechanism,
        file: file.slice(BACKEND_INVENTORY.length + 1),
      });
    }
  }
  return routes;
}

function readCallSites(): CallSite[] {
  const files = [
    ...walk(FRONTEND_INVENTORY_HOOKS, (n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)),
    join(FRONTEND_API_HOOKS, "inv-ai-explain.ts"),
  ];
  const sites: CallSite[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const constants = new Map<string, string>();
    for (const m of source.matchAll(
      /\b(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)/g,
    ))
      constants.set(m[1] ?? "", m[2] ?? m[3] ?? m[4] ?? "");

    for (const m of source.matchAll(
      new RegExp(`apiClient\\s*\\.\\s*(${MUTATING_VERBS.join("|")})\\b`, "g"),
    )) {
      const open = skipTypeArguments(source, (m.index ?? 0) + m[0].length);
      if (source[open] !== "(") continue;
      const close = balancedEnd(source, open);
      if (close === -1) continue;
      // Comments are stripped before the header is looked for: two call sites
      // carried a comment *about* the `Idempotency-Key` and no header at all,
      // and a substring check read those as compliant.
      const args = source
        .slice(open, close)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");

      const literal = args.match(/(?:"(\/[^"]*)"|'(\/[^']*)'|`(\/[^`]*)`)/);
      let raw = literal ? (literal[1] ?? literal[2] ?? literal[3] ?? null) : null;
      let viaConstant = false;
      if (raw === null) {
        const identifier = args.match(/^\(\s*([A-Za-z0-9_$]+)\s*[,)]/);
        const resolved = identifier ? constants.get(identifier[1] ?? "") : undefined;
        if (resolved === undefined) continue;
        raw = resolved;
        viaConstant = true;
      }

      let resolvedPath = raw;
      for (let pass = 0; pass < 3; pass++)
        resolvedPath = resolvedPath.replace(/\$\{\s*([A-Za-z0-9_$]+)\s*\}/g, (all, name: string) => {
          const value = constants.get(name);
          if (value === undefined) return all;
          viaConstant = true;
          return value;
        });
      const normalised = (resolvedPath.split("?")[0] ?? "")
        .replace(/\$\{[^}]*\}/g, "*")
        .replace(/\/+/g, "/");
      if (!normalised.startsWith("/inventory")) continue;

      const mutationFnAt = source.lastIndexOf("mutationFn:", open);
      const paramsOpen = mutationFnAt === -1 ? -1 : source.indexOf("(", mutationFnAt);
      const paramsClose = paramsOpen === -1 ? -1 : balancedEnd(source, paramsOpen);
      const keyIsAParameter =
        paramsClose !== -1 && source.slice(paramsOpen, paramsClose).includes("idempotencyKey");

      const owner = ["useMutation", "useIdempotentMutation", "useAuthorizedIdempotentMutation", "useAuthorizedMutation"]
        .map((name) => ({ name, at: mutationFnAt === -1 ? -1 : source.lastIndexOf(name, mutationFnAt) }))
        .filter((candidate) => candidate.at >= 0)
        .sort((a, b) => b.at - a.at)[0]?.name;

      sites.push({
        file: file.slice(FRONTEND_API_HOOKS.length + 1),
        method: (m[1] ?? "").toUpperCase(),
        path: normalised,
        segments: normalised.split("/").filter(Boolean),
        carriesKey: args.includes("Idempotency-Key"),
        viaConstant,
        // Two shapes survive a retry: the hook owns the key across attempts, or
        // the caller does and hands it in as a mutation variable — which is what
        // a scanner needs, because a second physical scan is a second fact.
        keyOutlivesTheAttempt:
          owner === "useIdempotentMutation" ||
          owner === "useAuthorizedIdempotentMutation" ||
          keyIsAParameter,
      });
    }
  }
  return sites;
}

/** A backend `:param` and a frontend `${…}` both match any single segment. */
function segmentsMatch(route: string[], call: string[]): boolean {
  if (route.length !== call.length) return false;
  return route.every((segment, index) => {
    const other = call[index];
    if (segment === other) return true;
    return segment.startsWith(":") || other === "*";
  });
}

const fenced = readFencedRoutes();
const sites = readCallSites();
const fencedCalls = sites.filter((site) =>
  fenced.some((route) => route.method === site.method && segmentsMatch(route.segments, site.segments)),
);

describe("inventory commands carry a key scoped to the operator's intent", () => {
  it("reads the paired backend, so a missing checkout cannot pass as zero violations", () => {
    expect(BACKEND_INVENTORY).not.toBeNull();
    expect(fenced.length).toBeGreaterThan(100);
    // Both fencing mechanisms have to be visible. A scanner that saw only the
    // route decorator reported 34 fenced routes and called the other 51 unfenced.
    expect(new Set(fenced.map((r) => r.mechanism))).toEqual(
      new Set(["@Idempotent", "@IdempotencyKey"]),
    );
    expect(fenced.filter((r) => r.mechanism === "@IdempotencyKey").length).toBeGreaterThan(30);
  });

  it("walks the hooks, so a broken walk cannot pass as zero violations", () => {
    expect(sites.length).toBeGreaterThan(100);
    expect(new Set(sites.map((s) => s.file)).size).toBeGreaterThan(15);
    expect(fencedCalls.length).toBeGreaterThan(80);
    // The literal-only matcher this replaced could not see `apiClient.post(BASE, …)`.
    expect(sites.some((s) => s.viaConstant)).toBe(true);
  });

  it("never leaves a fenced command relying on the per-attempt key api-client mints", () => {
    const relying = fencedCalls
      .filter((s) => !s.carriesKey)
      .map((s) => `${s.file} -> ${s.method} ${s.path}`)
      .sort();

    expect(relying).toEqual([]);
  });

  it("gives every one of them a key that outlives the attempt", () => {
    // Passing a key is not enough on its own: a key minted inside the mutationFn
    // would be per-attempt again and would satisfy the assertion above while
    // changing nothing. It has to come from the hook that owns the intent, or
    // from the caller that owns it.
    const perAttempt = fencedCalls
      .filter((s) => !s.keyOutlivesTheAttempt)
      .map((s) => `${s.file} -> ${s.method} ${s.path}`)
      .sort();

    expect(perAttempt).toEqual([]);
  });
});
