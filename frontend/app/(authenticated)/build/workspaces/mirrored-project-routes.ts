export const WORKSPACE_PROJECT_ROUTE_ROOT =
  "app/(authenticated)/build/workspaces/[pmWorkspaceId]/[projectId]";

export const MIRRORED_WORKSPACE_PROJECT_SUBPATHS: readonly string[] = [
  "",
  "/epics",
  "/my-tickets",
  "/settings",
  "/views",
];

export function hasWorkspaceMirror(subPath: string): boolean {
  return MIRRORED_WORKSPACE_PROJECT_SUBPATHS.includes(subPath);
}

export function projectSubPath(
  pathname: string,
  projectId: string,
): string | null {
  const base = `/build/${projectId}`;
  if (pathname === base) return "";
  if (!pathname.startsWith(`${base}/`)) return null;
  return pathname.slice(base.length);
}
