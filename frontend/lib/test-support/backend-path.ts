import fs from "node:fs";
import path from "node:path";

const LAYOUTS = [
  ["frontend", "backend"],
  ["streamlineos-frontend", "streamlineos-backend"],
] as const;

function frontendRoot(): string {
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json")) && path.basename(dir) === "frontend")
      return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(__dirname, "../..");
}

function pairedSibling(root: string, relative: string): string | null {
  const repoDir = path.dirname(root);
  const repoName = path.basename(repoDir);
  const suffix = "-frontend";
  if (!repoName.endsWith(suffix)) return null;
  const paired = `${repoName.slice(0, -suffix.length)}-backend`;
  return path.resolve(path.dirname(repoDir), paired, relative);
}

export function backendPath(relative: string): string {
  const override = process.env.STREAMLINE_BACKEND_ROOT;
  if (override) return path.resolve(override, relative);

  const root = frontendRoot();
  const paired = pairedSibling(root, relative);
  const candidates = [
    ...(paired === null ? [] : [paired]),
    ...LAYOUTS.map(([frontendDir, backendDir]) =>
      path.resolve(
        root,
        "..",
        root.endsWith(frontendDir) ? backendDir : `../${backendDir}`,
        relative,
      ),
    ),
  ];

  const [first] = candidates;
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? first;
}

export function backendReachable(relative: string): boolean {
  return fs.existsSync(backendPath(relative));
}
