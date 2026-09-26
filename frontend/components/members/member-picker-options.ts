"use client";

import { useMemo } from "react";
import { useOrgMembers, useOrgMembersByIds } from "@/hooks/api/organization";
import { useProjectMembers } from "@/hooks/api/build/projects";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useModuleMemberCandidates } from "@/hooks/api/module-access";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

export interface MemberOption extends NamedUser {
  id: string;
  email: string;
  image: string | null;
  /** A second line under the name in the option list (e.g. designation · state). */
  description?: string | null;
}

export function useMemberOptions(
  candidates: MemberOption[] | undefined,
  projectId: number | undefined,
  moduleKey: string | undefined,
  excludeAssigned: boolean,
  enabled: boolean,
  search: string,
  selectedIds: string[],
): { options: MemberOption[]; selectedMembers: MemberOption[] } {
  const explicit = candidates !== undefined;
  const canViewOrgMembers = useCan("settings:view");
  const canViewBuildMembers = useCan("build:members:view");
  const useOrgDirectory =
    enabled && !explicit && projectId === undefined && moduleKey === undefined && canViewOrgMembers;
  const useWorkspaceDirectory =
    enabled &&
    !explicit &&
    projectId === undefined &&
    moduleKey === undefined &&
    !canViewOrgMembers &&
    canViewBuildMembers;
  const useModuleDirectory = !explicit && moduleKey !== undefined && enabled;

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data: orgData } = useOrgMembers(1, 50, debouncedSearch || undefined, {
    enabled: useOrgDirectory,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
  const { data: workspaceData } = useBuildMembers(
    { limit: 200, search: debouncedSearch || undefined },
    {
      enabled: useWorkspaceDirectory,
      staleTime: 30_000,
      placeholderData: (prev) => prev,
    },
  );
  const { data: projectMembers = [] } = useProjectMembers(projectId ?? 0, {
    enabled: enabled && !explicit && projectId !== undefined,
  });
  const { data: moduleData } = useModuleMemberCandidates(
    moduleKey ?? "",
    50,
    debouncedSearch,
    { enabled: useModuleDirectory, userId: selectedIds[0], excludeAssigned },
  );
  const moduleOptions = useMemo(
    () =>
      (moduleData?.data ?? []).map((c) => ({
        id: c.userId,
        name: c.displayName,
        firstName: null,
        lastName: null,
        email: c.email,
        image: c.avatarUrl ?? null,
      })),
    [moduleData?.data],
  );

  const orgOptions = useMemo(
    () =>
      (orgData?.data ?? []).map((m) => ({
        id: m.userId,
        name: m.name,
        firstName: null,
        lastName: null,
        email: m.email,
        image: m.image,
      })),
    [orgData?.data],
  );

  const workspaceOptions = useMemo(
    () =>
      (workspaceData?.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      })),
    [workspaceData?.data],
  );

  const missingIds = useMemo(
    () =>
      useOrgDirectory
        ? selectedIds.filter((id) => !orgOptions.some((m) => m.id === id))
        : [],
    [useOrgDirectory, selectedIds, orgOptions],
  );
  const { data: selectedData } = useOrgMembersByIds(missingIds);

  return useMemo(() => {
    if (candidates !== undefined) {
      return {
        options: candidates,
        selectedMembers: candidates.filter((m) => selectedIds.includes(m.id)),
      };
    }
    if (projectId !== undefined) {
      const options = projectMembers.map((m) => ({
        id: m.id,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      }));
      return {
        options,
        selectedMembers: options.filter((m) => selectedIds.includes(m.id)),
      };
    }
    if (useOrgDirectory) {
      const resolved = (selectedData?.data ?? []).map((m) => ({
        id: m.userId,
        name: m.name,
        firstName: null,
        lastName: null,
        email: m.email,
        image: m.image,
      }));
      const byId = new Map<string, MemberOption>();
      for (const m of [...orgOptions, ...resolved]) byId.set(m.id, m);
      return {
        options: orgOptions,
        selectedMembers: selectedIds
          .map((id) => byId.get(id))
          .filter((m): m is MemberOption => m !== undefined),
      };
    }
    if (useModuleDirectory) {
      return {
        options: moduleOptions,
        selectedMembers: moduleOptions.filter((m) => selectedIds.includes(m.id)),
      };
    }
    return {
      options: workspaceOptions,
      selectedMembers: workspaceOptions.filter((m) => selectedIds.includes(m.id)),
    };
  }, [
    candidates,
    projectId,
    useOrgDirectory,
    useModuleDirectory,
    projectMembers,
    orgOptions,
    moduleOptions,
    workspaceOptions,
    selectedData?.data,
    selectedIds,
  ]);
}

export function filterMembers(
  members: MemberOption[],
  search: string,
  serverFiltered: boolean,
  excludeUserId?: string,
  excludeUserIds?: string[],
) {
  const excludeSet = new Set<string>(excludeUserIds ?? []);
  if (excludeUserId) excludeSet.add(excludeUserId);
  const eligible = excludeSet.size > 0
    ? members.filter((m) => !excludeSet.has(m.id))
    : members;
  if (serverFiltered || !search.trim()) return eligible;
  const q = search.toLowerCase();
  return eligible.filter(
    (m) =>
      getUserDisplayName(m).toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q),
  );
}
