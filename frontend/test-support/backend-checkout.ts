import fs from "node:fs";
import path from "node:path";

const CANDIDATES = ["backend", "../streamlineos-backend"] as const;

function pairedWorktree(here: string): string | null {
  const name = path.basename(path.resolve(here, ".."));
  if (!name.endsWith("-frontend")) return null;
  return `../${name.slice(0, -"-frontend".length)}-backend`;
}

export function backendRoot(): string | null {
  const override = process.env.STREAMLINE_BACKEND_ROOT;
  if (override) {
    const root = path.resolve(override);
    return fs.existsSync(path.join(root, "src", "modules")) ? root : null;
  }
  const here = path.resolve(__dirname, "..");
  const paired = pairedWorktree(here);
  const candidates = paired === null ? CANDIDATES : [paired, ...CANDIDATES];

  for (const candidate of candidates) {
    const root = path.resolve(here, "..", candidate);
    if (fs.existsSync(path.join(root, "src", "modules"))) return root;
  }
  return null;
}

export function backendPath(...segments: string[]): string | null {
  const root = backendRoot();
  return root === null ? null : path.join(root, ...segments);
}
