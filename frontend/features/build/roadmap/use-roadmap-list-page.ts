"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  BUILD_FILTER_ALL,
  type BuildListFiltersState,
} from "@/features/build/shared/use-build-list-filters";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { getUserDisplayName } from "@/lib/person-display";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import type { ScorableRoadmapItem } from "./roadmap-item-card";

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

export function useRoadmapListPage(listFilters: BuildListFiltersState) {
  const horizonValue = listFilters.value("horizon");
  const horizon =
    horizonValue !== BUILD_FILTER_ALL && horizonValue !== ""
      ? horizonValue
      : undefined;
  const [roadmapCreateOpen, setRoadmapCreateOpen] = useState(false);
  const [changelogCreateOpen, setChangelogCreateOpen] = useState(false);
  const [roadmapItems, setRoadmapItems] = useState<ScorableRoadmapItem[]>([]);
  const [externalEditTarget, setExternalEditTarget] =
    useState<ScorableRoadmapItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tabValue = listFilters.value("tab");
  const activeTab: RoadmapTabValue =
    tabValue === "feedback"
      ? "feedback"
      : tabValue === "changelog"
        ? "changelog"
        : "roadmap";

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const productIdValue = listFilters.value("productId");
  const managedProductId = /^\d+$/.test(productIdValue)
    ? Number(productIdValue)
    : undefined;
  const projectIdValue = listFilters.value("projectId");
  const projectId = /^\d+$/.test(projectIdValue)
    ? Number(projectIdValue)
    : undefined;
  const ownerIdValue = listFilters.value("ownerId");
  const ownerId = /^\d+$/.test(ownerIdValue) ? Number(ownerIdValue) : undefined;

  const { data: buildMembersPage } = useBuildMembers({ limit: 100 });
  const buildMemberIds = useMemo(
    () => new Set((buildMembersPage?.data ?? []).map((member) => member.id)),
    [buildMembersPage],
  );
  const buildMemberIdsList = useMemo(
    () => [...buildMemberIds],
    [buildMemberIds],
  );
  const { data: membersPage } = useOrgMembersByIds(buildMemberIdsList);
  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "Any owner" },
      ...(membersPage?.data ?? [])
        .filter((member) => buildMemberIds.has(member.userId))
        .map((m) => ({
          value: String(m.membershipId),
          label: getUserDisplayName(m),
        })),
    ],
    [buildMemberIds, membersPage],
  );

  const handleTabChange = useCallback(
    (value: string) => {
      listFilters.setValue("tab", value);
    },
    [listFilters],
  );

  const handleOpenRoadmapCreate = useCallback(() => {
    setRoadmapCreateOpen(true);
  }, []);
  const handleOpenChangelogCreate = useCallback(() => {
    setChangelogCreateOpen(true);
  }, []);
  const handleRoadmapCreateOpenChange = useCallback((open: boolean) => {
    setRoadmapCreateOpen(open);
  }, []);
  const handleChangelogCreateOpenChange = useCallback((open: boolean) => {
    setChangelogCreateOpen(open);
  }, []);

  const handleRoadmapEditByIndex = useCallback(
    (index: number) => {
      const item = roadmapItems[index];
      if (item) setExternalEditTarget(item);
    },
    [roadmapItems],
  );

  const handleExternalEditClose = useCallback(() => {
    setExternalEditTarget(null);
  }, []);
  const handleRoadmapItemsChange = useCallback(
    (items: ScorableRoadmapItem[]) => {
      setRoadmapItems(items);
    },
    [],
  );

  const handleStatusFilterChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleSortFilterChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleOwnerFilterChange = useCallback(
    (value: string) =>
      listFilters.setValue("ownerId", value === BUILD_FILTER_ALL ? "" : value),
    [listFilters],
  );
  const handleHorizonCommit = useCallback(
    (value: string) => listFilters.setValue("horizon", value.trim()),
    [listFilters],
  );

  const handleClearSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: roadmapItems.length,
    onOpen: handleRoadmapEditByIndex,
    onEdit: handleRoadmapEditByIndex,
    onCreate: handleOpenRoadmapCreate,
    onClearSelection: handleClearSelection,
    enabled: activeTab === "roadmap",
    searchInputRef,
  });

  return {
    activeTab,
    roadmapCreateOpen,
    changelogCreateOpen,
    roadmapItems,
    externalEditTarget,
    statusValue,
    sortValue,
    managedProductId,
    projectId,
    horizon,
    ownerId,
    ownerOptions,
    searchInputRef,
    handleTabChange,
    handleOpenRoadmapCreate,
    handleOpenChangelogCreate,
    handleRoadmapCreateOpenChange,
    handleChangelogCreateOpenChange,
    handleRoadmapEditByIndex,
    handleExternalEditClose,
    handleRoadmapItemsChange,
    handleStatusFilterChange,
    handleSortFilterChange,
    handleOwnerFilterChange,
    handleHorizonCommit,
  };
}
