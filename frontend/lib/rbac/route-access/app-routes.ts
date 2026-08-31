import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const GROUP_SEGMENT = /^\(.+\)$/;
const DYNAMIC_SEGMENT = /^\[.+\]$/;

function sampleForDynamicSegment(segment: string): string {
  const name = segment.replace(/^\[+\.{0,3}/, "").replace(/\]+$/, "");
  return name.toLowerCase().includes("slug") ? "sample-slug" : "1";
}

export function routePathFromPageFile(relativeFile: string): string {
  const segments = relativeFile.split(/[\\/]/).slice(0, -1);
  const kept: string[] = [];
  for (const segment of segments) {
    if (GROUP_SEGMENT.test(segment)) continue;
    if (segment.startsWith("@")) continue;
    if (DYNAMIC_SEGMENT.test(segment)) {
      kept.push(sampleForDynamicSegment(segment));
      continue;
    }
    kept.push(segment);
  }
  const joined = `/${kept.join("/")}`.replace(/\/+$/, "");
  return joined === "" ? "/" : joined;
}

function walkPageFiles(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkPageFiles(full, base));
      continue;
    }
    if (entry === "page.tsx" || entry === "page.jsx")
      out.push(full.slice(base.length + 1));
  }
  return out;
}

export interface AppRoute {
  readonly file: string;
  readonly path: string;
}

export function collectAppRoutes(groupSegment: string): AppRoute[] {
  const appDir = resolve(process.cwd(), "app");
  if (!existsSync(appDir)) return [];
  const seen = new Set<string>();
  const routes: AppRoute[] = [];
  for (const file of walkPageFiles(appDir, appDir)) {
    if (!file.split(/[\\/]/).includes(groupSegment)) continue;
    const path = routePathFromPageFile(file);
    if (seen.has(path)) continue;
    seen.add(path);
    routes.push({ file, path });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}
