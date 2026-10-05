import { useCallback, useMemo } from "react";
import { useProjectApprovals } from "@/hooks/api/build/approvals";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { STATUS_OPTIONS, ENTITY_OPTIONS } from "./approvals-constants";

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
  { param: "entityType", options: ENTITY_OPTIONS.map((o) => o.value) },
  { param: "actorId" },
] as const;

export function useApprovalsData(projectId: number) {
  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: false,
  });

  const statusValue = listFilters.value("status");
  const entityTypeValue = listFilters.value("entityType");
  const actorIdValue = listFilters.value("actorId");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProjectApprovals(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    entityType: entityTypeValue !== BUILD_FILTER_ALL ? entityTypeValue : undefined,
    actorId: actorIdValue !== BUILD_FILTER_ALL ? actorIdValue : undefined,
  });

  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);
  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const approverOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All approvers" },
      ...members.map((m) => ({ value: m.userId, label: m.name ?? m.email })),
    ],
    [members],
  );

  const memberName = useCallback(
    (membershipId: number | null): string => {
      if (membershipId == null) return "—";
      const m = members.find((x) => x.membershipId === membershipId);
      return m?.name ?? m?.email ?? "Unknown";
    },
    [members],
  );

  const ownerOf = useCallback(
    (membershipId: number | null) => {
      if (membershipId == null) return null;
      const m = members.find((x) => x.membershipId === membershipId);
      return m ? { name: m.name ?? undefined, email: m.email } : null;
    },
    [members],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleEntityTypeChange = useCallback(
    (value: string) => listFilters.setValue("entityType", value),
    [listFilters],
  );
  const handleActorIdChange = useCallback(
    (value: string) => listFilters.setValue("actorId", value),
    [listFilters],
  );
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleNextPage = useCallback(
    () => void fetchNextPage(),
    [fetchNextPage],
  );

  return {
    listFilters,
    statusValue,
    entityTypeValue,
    actorIdValue,
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    items,
    members,
    approverOptions,
    memberName,
    ownerOf,
    handleStatusChange,
    handleEntityTypeChange,
    handleActorIdChange,
    handleRetry,
    handleNextPage,
  };
}
