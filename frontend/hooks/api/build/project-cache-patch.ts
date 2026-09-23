import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type {
  ProjectListItem,
  ProjectListResponse,
  ProjectWithDetails,
  UpdateProjectInput,
} from "@/types/projects";
import type { OrgMember } from "@/types/organization";

type WorkspaceUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name?: string | null;
  image: string | null;
};

function resolveListManager(
  managerId: string,
  project: ProjectListItem,
  workspaceUsers: WorkspaceUser[],
): ProjectListItem["manager"] {
  if (project.manager?.id === managerId) return project.manager;
  const fromMembers = project.members.find((m) => m.id === managerId);
  if (fromMembers) {
    return {
      id: fromMembers.id,
      firstName: fromMembers.firstName,
      lastName: fromMembers.lastName,
      image: fromMembers.image,
    };
  }
  const fromWorkspace = workspaceUsers.find((u) => u.id === managerId);
  if (fromWorkspace) {
    return {
      id: fromWorkspace.id,
      firstName: fromWorkspace.firstName ?? fromWorkspace.name ?? null,
      lastName: fromWorkspace.lastName,
      image: fromWorkspace.image,
    };
  }
  return null;
}

function resolveListMembers(
  memberIds: string[],
  project: ProjectListItem,
  workspaceUsers: WorkspaceUser[],
): ProjectListItem["members"] {
  return memberIds.map((id) => {
    const existing = project.members.find((m) => m.id === id);
    if (existing) return existing;
    const fromWorkspace = workspaceUsers.find((u) => u.id === id);
    if (fromWorkspace) {
      return {
        id: fromWorkspace.id,
        firstName: fromWorkspace.firstName ?? fromWorkspace.name ?? null,
        lastName: fromWorkspace.lastName,
        image: fromWorkspace.image,
      };
    }
    return { id, firstName: null, lastName: null, image: null };
  });
}

export function getWorkspaceUsersFromCache(queryClient: QueryClient): WorkspaceUser[] {
  const workspaceEntries = queryClient.getQueriesData<{ data: WorkspaceUser[] }>({
    queryKey: buildWorkQueryKeys.projects.buildMembers.all,
  });
  const fromWorkspace = workspaceEntries.flatMap(([, data]) => data?.data ?? []);

  const orgEntries = queryClient.getQueriesData<{ data: OrgMember[] }>({
    queryKey: platformCoreQueryKeys.organization.members(),
  });
  const fromOrg = orgEntries.flatMap(([, data]) =>
    (data?.data ?? []).map((m) => ({
      id: m.userId,
      firstName: m.name,
      lastName: null,
      name: m.name,
      image: m.image,
    })),
  );

  const seen = new Set<string>();
  const merged: WorkspaceUser[] = [];
  for (const user of [...fromOrg, ...fromWorkspace]) {
    if (seen.has(user.id)) continue;
    seen.add(user.id);
    merged.push(user);
  }
  return merged;
}

export type ProjectPatch = Omit<UpdateProjectInput, "projectId">;

/**
 * `/build` is keyset, so the list page reads it through `useInfiniteQuery` and
 * its cache is `InfiniteData`, not a single envelope. An optimistic patch that
 * only knows the flat shape leaves that page showing stale rows until a
 * refetch, so both shapes are patched and both are snapshotted.
 */
export type ProjectListCache = ProjectListResponse | InfiniteData<ProjectListResponse>;

export interface UpdateProjectContext {
  listSnapshots: [readonly unknown[], ProjectListCache | undefined][];
  detailKey: ReturnType<typeof buildWorkQueryKeys.projects.detail>;
  previousDetail: ProjectWithDetails | null | undefined;
}

function applyProjectListPatch(
  project: ProjectListItem,
  patch: ProjectPatch,
  workspaceUsers: WorkspaceUser[] = [],
): ProjectListItem {
  const next: ProjectListItem = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.priority !== undefined) next.priority = patch.priority ?? null;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  if (patch.managerId !== undefined) {
    next.manager = patch.managerId
      ? resolveListManager(patch.managerId, project, workspaceUsers)
      : null;
  }
  if (patch.memberIds !== undefined) {
    next.members = resolveListMembers(patch.memberIds, project, workspaceUsers);
  }
  return next;
}

export function patchProjectListCache(
  old: ProjectListCache | undefined,
  projectId: number,
  patch: ProjectPatch,
  workspaceUsers: WorkspaceUser[],
): ProjectListCache | undefined {
  if (!old) return old;
  const mapRows = (rows: ProjectListItem[]): ProjectListItem[] =>
    rows.map((p) =>
      p.id === projectId ? applyProjectListPatch(p, patch, workspaceUsers) : p,
    );
  if ("pages" in old)
    return {
      ...old,
      pages: old.pages.map((page) => ({ ...page, data: mapRows(page.data) })),
    };
  if (!old.data) return old;
  return { ...old, data: mapRows(old.data) };
}

export function applyProjectDetailPatch(
  project: ProjectWithDetails,
  patch: ProjectPatch,
): ProjectWithDetails {
  const next: ProjectWithDetails = { ...project };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined)
    next.description = patch.description ?? null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.startDate !== undefined) next.startDate = patch.startDate;
  if (patch.endDate !== undefined) next.endDate = patch.endDate;
  return next;
}
