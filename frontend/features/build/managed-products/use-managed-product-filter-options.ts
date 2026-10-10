import { useMemo, useCallback } from "react";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useManagedProductFacets } from "@/hooks/api/build/managed-products";
import { useProjects } from "@/hooks/api/build/projects";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { NamedUser } from "@/lib/person-display";

export function useManagedProductFilterOptions() {
  const { data: membersRes } = useBuildMembers({ limit: 100 });
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const { data: teamsRes } = useProjectTeams({ pageSize: 100 });
  const teams = useMemo(() => teamsRes?.data ?? [], [teamsRes]);

  const teamOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All teams" },
      ...teams.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [teams],
  );

  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All owners" },
      ...members.map((m) => ({ value: m.id, label: m.name ?? m.email })),
    ],
    [members],
  );

  const { data: facetsData } = useManagedProductFacets();
  const { data: projectsListData } = useProjects({ limit: 100 });

  const segmentOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All segments" },
      ...(facetsData?.segments ?? []).map((s) => ({ value: s, label: s })),
    ],
    [facetsData],
  );

  const tagOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All tags" },
      ...(facetsData?.tags ?? []).map((t) => ({ value: t, label: t })),
    ],
    [facetsData],
  );

  const linkedProjectOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All projects" },
      ...(projectsListData?.data ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    ],
    [projectsListData],
  );

  const ownerOf = useCallback(
    (ownerId: string | null): NamedUser | null => {
      if (!ownerId) return null;
      const match = members.find((member) => member.id === ownerId);
      return match ? { name: match.name, email: match.email } : null;
    },
    [members],
  );

  return { teamOptions, ownerOptions, segmentOptions, tagOptions, linkedProjectOptions, ownerOf };
}
