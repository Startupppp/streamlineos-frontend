export function extractBuildProjectId(pathname: string): number | null {
  const match = /^\/build\/(?:workspaces\/[^/]+\/)?(\d+)(?:\/|$)/.exec(pathname);
  if (!match) return null;
  const parsed = parseInt(match[1] ?? "", 10);
  return Number.isNaN(parsed) ? null : parsed;
}
