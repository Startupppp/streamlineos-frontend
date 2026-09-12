import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { backendPath } from "@/test-support/backend-checkout";

export const BACKEND_INVENTORY = backendPath("src/modules/inventory");
const FRONTEND_INVENTORY_HOOKS = join(__dirname, "..");
const FRONTEND_API_HOOKS = join(__dirname, "..", "..");

export const MUTATING_VERBS = ["post", "patch", "put", "delete"] as const;

export interface FencedRoute {
  method: string;
  segments: string[];
  mechanism: string;
  file: string;
}

export interface CallSite {
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

export function readFencedRoutes(): FencedRoute[] {
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

export function parseCallSites(source: string, file: string): CallSite[] {
  const sites: CallSite[] = [];
  {
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
        file,
        method: (m[1] ?? "").toUpperCase(),
        path: normalised,
        segments: normalised.split("/").filter(Boolean),
        carriesKey: args.includes("Idempotency-Key"),
        viaConstant,
        keyOutlivesTheAttempt:
          owner === "useIdempotentMutation" ||
          owner === "useAuthorizedIdempotentMutation" ||
          keyIsAParameter,
      });
    }
  }
  return sites;
}

export function readCallSites(): CallSite[] {
  const files = [
    ...walk(FRONTEND_INVENTORY_HOOKS, (n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)),
    join(FRONTEND_API_HOOKS, "inv-ai-explain.ts"),
  ];
  return files.flatMap((file) =>
    parseCallSites(readFileSync(file, "utf8"), file.slice(FRONTEND_API_HOOKS.length + 1)),
  );
}

export function segmentsMatch(route: string[], call: string[]): boolean {
  if (route.length !== call.length) return false;
  return route.every((segment, index) => {
    const other = call[index];
    if (segment === other) return true;
    return segment.startsWith(":") || other === "*";
  });
}
