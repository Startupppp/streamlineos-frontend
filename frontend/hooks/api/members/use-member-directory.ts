"use client";

import { useMemo } from "react";
import { useOrgMembers, useOrgMembersByIds } from "@/hooks/api/organization";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useModuleMemberCandidates } from "@/hooks/api/module-access/members";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

export interface DirectoryMember {
  id: string;
  membershipId: number | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  image: string | null;
  description?: string | null;
  moduleAccessRevoked?: boolean;
}

export type DirectoryScope =
  | { kind: "org" }
  | { kind: "build" }
  | { kind: "project"; projectId: number }
  | { kind: "module"; moduleKey: string; excludeAssigned?: boolean; includeRevoked?: boolean }
  | { kind: "explicit"; members: DirectoryMember[] };

export interface DirectoryOptions {
  search?: string;
  enabled?: boolean;
  selectedIds?: string[];
}

export function useMemberDirectory(
  scope: DirectoryScope,
  options?: DirectoryOptions,
) {
  const callerEnabled = options?.enabled ?? true;
  const selectedIds = useMemo(() => options?.selectedIds ?? [], [options?.selectedIds]);
  const rawSearch = options?.search ?? "";

  const canViewOrgMembers = useCan("settings:view");
  const canViewBuildMembers = useCan("build:members:view");

  const debouncedSearch = useDebouncedValue(rawSearch.trim(), 300);

  const useOrgScope =
    scope.kind === "org" && canViewOrgMembers && callerEnabled;
  const useBuildScope =
    scope.kind === "build" && canViewBuildMembers && callerEnabled;
  const useBuildFallback =
    scope.kind === "org" && !canViewOrgMembers && canViewBuildMembers && callerEnabled;
  const useProjectScope =
    scope.kind === "project" && callerEnabled;
  const useModuleScope =
    scope.kind === "module" && callerEnabled;

  const { data: orgData, isLoading: orgLoading } = useOrgMembers(1, 50, debouncedSearch || undefined, {
    enabled: useOrgScope,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: buildData, isLoading: buildLoading } = useBuildMembers(
    { limit: 200, search: debouncedSearch || undefined },
    {
      enabled: useBuildScope || useBuildFallback,
      staleTime: 30_000,
      placeholderData: (prev) => prev,
    },
  );

  const { data: projectData, isLoading: projectLoading } = useProjectMembers(
    scope.kind === "project" ? scope.projectId : 0,
    undefined,
    { enabled: useProjectScope },
  );

  const moduleKey = scope.kind === "module" ? scope.moduleKey : "";
  const excludeAssigned = scope.kind === "module" ? (scope.excludeAssigned ?? true) : true;
  const includeRevoked = scope.kind === "module" ? (scope.includeRevoked ?? false) : false;

  const { data: moduleData, isLoading: moduleLoading } = useModuleMemberCandidates(
    moduleKey,
    50,
    debouncedSearch,
    {
      enabled: useModuleScope,
      userId: selectedIds[0],
      excludeAssigned,
      includeRevoked,
    },
  );

  const orgMembers = useMemo<DirectoryMember[]>(
    () =>
      (orgData?.data ?? []).map((m) => ({
        id: m.userId,
        membershipId: m.membershipId,
        name: m.name,
        firstName: null,
        lastName: null,
        email: m.email,
        image: m.image,
      })),
    [orgData?.data],
  );

  const buildMembers = useMemo<DirectoryMember[]>(
    () =>
      (buildData?.data ?? []).map((m) => ({
        id: m.id,
        membershipId: m.membershipId,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      })),
    [buildData?.data],
  );

  const projectMembers = useMemo<DirectoryMember[]>(
    () =>
      (projectData?.data ?? []).map((m) => ({
        id: m.id,
        membershipId: null,
        name: m.name,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
      })),
    [projectData?.data],
  );

  const moduleMembers = useMemo<DirectoryMember[]>(
    () =>
      (moduleData?.data ?? []).map((c) => ({
        id: c.userId,
        membershipId: null,
        name: c.displayName,
        firstName: null,
        lastName: null,
        email: c.email,
        image: c.avatarUrl ?? null,
        moduleAccessRevoked: c.moduleAccessRevoked,
        description: c.moduleAccessRevoked
          ? "Access revoked — adding restores module access"
          : null,
      })),
    [moduleData?.data],
  );

  const missingIds = useMemo(
    () =>
      useOrgScope
        ? selectedIds.filter((id) => !orgMembers.some((m) => m.id === id))
        : [],
    [useOrgScope, selectedIds, orgMembers],
  );

  const { data: selectedData } = useOrgMembersByIds(missingIds);

  const resolvedOrgSelected = useMemo<DirectoryMember[]>(
    () =>
      (selectedData?.data ?? []).map((m) => ({
        id: m.userId,
        membershipId: m.membershipId,
        name: m.name,
        firstName: null,
        lastName: null,
        email: m.email,
        image: m.image,
      })),
    [selectedData?.data],
  );

  const scopeKind = scope.kind;
  const explicitMembers = scope.kind === "explicit" ? scope.members : null;

  return useMemo(() => {
    if (explicitMembers !== null) {
      return {
        members: explicitMembers,
        selectedMembers: explicitMembers.filter((m) => selectedIds.includes(m.id)),
        isLoading: false,
        isServerFiltered: false,
      };
    }

    if (scopeKind === "project") {
      return {
        members: projectMembers,
        selectedMembers: projectMembers.filter((m) => selectedIds.includes(m.id)),
        isLoading: projectLoading,
        isServerFiltered: false,
      };
    }

    if (useOrgScope) {
      const byId = new Map<string, DirectoryMember>();
      for (const m of [...orgMembers, ...resolvedOrgSelected]) byId.set(m.id, m);
      return {
        members: orgMembers,
        selectedMembers: selectedIds
          .map((id) => byId.get(id))
          .filter((m): m is DirectoryMember => m !== undefined),
        isLoading: orgLoading,
        isServerFiltered: true,
      };
    }

    if (useModuleScope) {
      return {
        members: moduleMembers,
        selectedMembers: moduleMembers.filter((m) => selectedIds.includes(m.id)),
        isLoading: moduleLoading,
        isServerFiltered: true,
      };
    }

    return {
      members: buildMembers,
      selectedMembers: buildMembers.filter((m) => selectedIds.includes(m.id)),
      isLoading: buildLoading,
      isServerFiltered: debouncedSearch.length > 0,
    };
  }, [
    explicitMembers,
    scopeKind,
    useOrgScope,
    useModuleScope,
    projectMembers,
    orgMembers,
    resolvedOrgSelected,
    moduleMembers,
    buildMembers,
    selectedIds,
    debouncedSearch,
    orgLoading,
    buildLoading,
    projectLoading,
    moduleLoading,
  ]);
}
