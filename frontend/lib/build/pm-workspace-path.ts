const WORKSPACE_PREFIX = "/build/workspaces/";

export function parsePmWorkspaceIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(WORKSPACE_PREFIX)) return null;
  const rest = pathname.slice(WORKSPACE_PREFIX.length);
  const slash = rest.indexOf("/");
  const id = slash === -1 ? rest : rest.slice(0, slash);
  return id.length > 0 ? id : null;
}

export function stripPmWorkspacePrefix(pathname: string): string {
  const workspaceId = parsePmWorkspaceIdFromPath(pathname);
  if (!workspaceId) return pathname;
  const suffix = pathname.slice(WORKSPACE_PREFIX.length + workspaceId.length);
  if (suffix.length === 0) return "/build";
  return suffix.startsWith("/") ? `/build${suffix}` : `/build/${suffix}`;
}

export function withPmWorkspacePath(
  pathname: string,
  search: string,
  pmWorkspaceId: string,
): string {
  const basePath = stripPmWorkspacePrefix(pathname);
  const relative =
    basePath === "/build"
      ? ""
      : basePath.startsWith("/build/")
        ? basePath.slice("/build".length)
        : basePath;
  const nextPath = `${WORKSPACE_PREFIX}${pmWorkspaceId}${relative}`;
  return search.length > 0 ? `${nextPath}?${search}` : nextPath;
}
