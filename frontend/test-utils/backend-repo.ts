import fs from "node:fs";
import path from "node:path";

const MARKER = path.join("src", "modules", "rbac", "permissions");

function isBackendRoot(candidate: string): boolean {
  return fs.existsSync(path.join(candidate, MARKER));
}

function pairedWorktreeRoots(): string[] {
  const roots: string[] = [];
  const suffix = "-frontend";
  let dir = __dirname;
  for (let depth = 0; depth < 8; depth++) {
    const name = path.basename(dir);
    if (name.endsWith(suffix))
      roots.push(path.join(path.dirname(dir), `${name.slice(0, -suffix.length)}-backend`));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

function candidateRoots(): string[] {
  const roots: string[] = pairedWorktreeRoots();
  let dir = __dirname;
  for (let depth = 0; depth < 8; depth++) {
    roots.push(path.join(dir, "backend"));
    roots.push(path.join(dir, "streamlineos-backend"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return roots;
}

function resolveBackendRoot(): string | null {
  const override = process.env.STREAMLINE_BACKEND_ROOT;
  if (override) {
    const resolved = path.resolve(override);
    return isBackendRoot(resolved) ? resolved : null;
  }
  for (const candidate of candidateRoots())
    if (isBackendRoot(candidate)) return candidate;
  return null;
}

const resolvedRoot = resolveBackendRoot();

export const BACKEND_ROOT = resolvedRoot;

export const backendAvailable = resolvedRoot !== null;

export function backendPath(...segments: string[]): string {
  if (resolvedRoot === null)
    throw new Error(
      `Backend repository not found. Searched for a directory containing ${MARKER} beside or above ${__dirname}. Set STREAMLINE_BACKEND_ROOT to override.`,
    );
  return path.join(resolvedRoot, ...segments);
}
