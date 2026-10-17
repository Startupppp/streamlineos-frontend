"use client";

import { useMemo, useCallback } from "react";
import { useProjects } from "@/hooks/api/build/projects";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useProjectTeams } from "@/hooks/api/build/teams";
import { useManagedProducts } from "@/hooks/api/build/managed-products";
import { useOrgCustomStates } from "@/hooks/api/build/custom-states";

interface UseAllWorkPageDataParams {
  setListParams: (params: Record<string, string | null>) => void;
  teamIdFilter: string | null | undefined;
  productIdFilter: string | null | undefined;
}

export function useAllWorkPageData({
  setListParams,
  teamIdFilter,
  productIdFilter,
}: UseAllWorkPageDataParams) {
  const { data: projectsData } = useProjects({ limit: 100 });
  const { data: buildMembersData } = useBuildMembers();
  const { data: orgStates } = useOrgCustomStates();
  const { data: teamsData } = useProjectTeams({ pageSize: 100 });
  const { data: productsData } = useManagedProducts({ limit: 100 });

  const teamOptions = useMemo(
    () => [
      { value: "", label: "All teams" },
      ...(teamsData?.data ?? []).map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [teamsData],
  );

  const productOptions = useMemo(
    () => [
      { value: "", label: "All products" },
      ...(productsData?.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [productsData],
  );

  const handleTeamFilter = useCallback(
    (value: string) => setListParams({ teamId: value || null, cursor: null }),
    [setListParams],
  );

  const handleProductFilter = useCallback(
    (value: string) => setListParams({ productId: value || null, cursor: null }),
    [setListParams],
  );

  const allProjects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const projectOptions = useMemo(
    () => allProjects.map((p) => ({ id: p.id, name: p.name, key: p.key })),
    [allProjects],
  );

  const buildMembers = buildMembersData?.data ?? [];

  return {
    projectOptions,
    buildMembers,
    orgStates,
    teamOptions,
    productOptions,
    teamIdFilter,
    productIdFilter,
    handleTeamFilter,
    handleProductFilter,
  };
}
