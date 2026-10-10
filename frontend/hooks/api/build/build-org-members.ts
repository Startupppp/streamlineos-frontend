"use client";

import { useMemo } from "react";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useOrgMembersByIds } from "@/hooks/api/organization";

export function useBuildOrgMembers(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const buildMembersQuery = useBuildMembers({ limit: 100 }, { enabled });
  const buildMemberIds = useMemo(
    () => (buildMembersQuery.data?.data ?? []).map((member) => member.id),
    [buildMembersQuery.data],
  );
  const orgMembersQuery = useOrgMembersByIds(buildMemberIds, { enabled });
  const members = useMemo(() => {
    const ids = new Set(buildMemberIds);
    return (orgMembersQuery.data?.data ?? []).filter((member) =>
      ids.has(member.userId),
    );
  }, [buildMemberIds, orgMembersQuery.data]);

  return { buildMembersQuery, orgMembersQuery, members };
}
