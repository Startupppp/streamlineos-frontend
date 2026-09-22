import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveRouteAccess } from "../route-access";

const APP_DIR = resolve(process.cwd(), "app");
const AUTHENTICATED_DIR = join(APP_DIR, "(authenticated)");
const BUILD_DIR = join(AUTHENTICATED_DIR, "build");

const GROUP_SEGMENT = /^\(.+\)$/;
const DYNAMIC_SEGMENT = /^\[.+\]$/;
const PERMISSION_KEY = /^[a-z][a-z0-9_-]*(?::[a-z0-9_-]+)+$/;

function pageFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pageFiles(full, out);
    else if (entry.name === "page.tsx" || entry.name === "page.jsx") out.push(full);
  }
  return out;
}

function segmentsOf(file: string): string[] {
  return dirname(file)
    .slice(AUTHENTICATED_DIR.length + 1)
    .split(/[\\/]/)
    .filter((segment) => segment.length > 0 && !GROUP_SEGMENT.test(segment) && !segment.startsWith("@"));
}

export function canonicalPatternOf(file: string): string {
  return `/${segmentsOf(file).join("/")}`;
}

function sampleFor(segment: string): string {
  const name = segment.replace(/^\[+\.{0,3}/, "").replace(/\]+$/, "");
  return name.toLowerCase().includes("slug") ? "sample-slug" : "1";
}

export function livePathOf(file: string): string {
  return `/${segmentsOf(file)
    .map((segment) => (DYNAMIC_SEGMENT.test(segment) ? sampleFor(segment) : segment))
    .join("/")}`;
}

function balancedCall(source: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < source.length; i += 1) {
    if (source[i] === "(") depth += 1;
    else if (source[i] === ")" && (depth -= 1) === 0) return source.slice(openParen, i + 1);
  }
  return "";
}

function callArguments(source: string, fn: string): string[] {
  return [...source.matchAll(new RegExp(`\\b${fn}\\s*\\(`, "g"))].map((match) =>
    balancedCall(source, (match.index ?? 0) + match[0].length - 1),
  );
}

function stringLiterals(args: string): string[] {
  return [...args.matchAll(/["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
}

function requiredKeysOf(pathname: string): string[] {
  const decision = resolveRouteAccess(pathname);
  if (decision.kind !== "permission") return [];
  const required = decision.permission;
  const keys: string[] = Array.isArray(required) ? [...required] : required ? [required] : [];
  if (decision.orgModuleKey) keys.push(`module:${decision.orgModuleKey}`);
  return keys;
}

function gateChain(pageFile: string): string[] {
  const files = [pageFile];
  let dir = dirname(pageFile);
  for (;;) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) files.push(layout);
    if (dir === AUTHENTICATED_DIR || dir.length <= AUTHENTICATED_DIR.length) break;
    dir = dirname(dir);
  }
  return files;
}

export function coldKeysOf(pageFile: string): Set<string> {
  const keys = new Set<string>();
  for (const file of gateChain(pageFile)) {
    const source = readFileSync(file, "utf8");
    for (const args of callArguments(source, "enforceRouteAccess"))
      for (const literal of stringLiterals(args))
        for (const key of requiredKeysOf(literal)) keys.add(key);
    for (const args of callArguments(source, "requirePermission"))
      for (const literal of stringLiterals(args).filter((v) => PERMISSION_KEY.test(v))) keys.add(literal);
    for (const args of callArguments(source, "requireModulePermission")) {
      const literals = stringLiterals(args);
      for (const literal of literals.slice(1).filter((v) => PERMISSION_KEY.test(v))) keys.add(literal);
      if (literals[0]) keys.add(`module:${literals[0]}`);
    }
  }
  return keys;
}

interface Row {
  readonly pattern: string;
  readonly live: string;
  readonly warm: string[];
  readonly cold: string[];
  readonly missing: string[];
}

function census(): Row[] {
  return pageFiles(BUILD_DIR)
    .map((file) => {
      const pattern = canonicalPatternOf(file);
      const live = livePathOf(file);
      const warm = requiredKeysOf(live);
      const cold = [...coldKeysOf(file)].sort();
      return { pattern, live, warm, cold, missing: warm.filter((key) => !cold.includes(key)) };
    })
    .sort((a, b) => a.pattern.localeCompare(b.pattern));
}

describe("Build cold-load gate census — with no middleware the literal argument decides the key", () => {
  const rows = census();

  it("sweeps every Build page, so a census that resolved nothing cannot report a clean tree", () => {
    expect(rows.length).toBeGreaterThanOrEqual(70);
  });

  it("every Build route resolves to a permission decision warm, so the comparison below is never against an empty set", () => {
    const unresolved = rows.filter((row) => row.warm.length === 0).map((row) => `${row.pattern} -> ${row.live}`);
    expect(unresolved).toEqual([]);
  });

  it("a canonical pattern resolves to the same keys as a live path, so passing the pattern is a faithful stand-in", () => {
    const divergent = rows
      .filter((row) => requiredKeysOf(row.pattern).join(",") !== row.warm.join(","))
      .map((row) => `${row.pattern}: pattern=${requiredKeysOf(row.pattern).join(",")} live=${row.warm.join(",")}`);
    expect(divergent).toEqual([]);
  });

  it("no Build route is gated more weakly on a cold document load than its warm resolution requires", () => {
    const weak = rows
      .filter((row) => row.missing.length > 0)
      .map((row) => `${row.pattern}  warm=[${row.warm.join(",")}]  cold=[${row.cold.join(",")}]  missing=[${row.missing.join(",")}]`);
    expect(weak).toEqual([]);
  });
});
