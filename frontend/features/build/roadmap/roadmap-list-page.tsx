"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { Input } from "@/components/ui/input";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { RoadmapTab } from "@/features/build/roadmap/roadmap-tab";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { FeedbackTab } from "@/features/build/roadmap/feedback-tab";
import { ChangelogTab } from "@/features/build/roadmap/changelog-tab";
import { RoadmapPublicationActions } from "@/features/build/roadmap/roadmap-publication-actions";
import { ROADMAP_SORTS } from "@/hooks/api/build/roadmap";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { ROADMAP_STATUS_OPTIONS } from "./roadmap-constants";

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

const ROADMAP_FILTER_STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  ...ROADMAP_STATUS_OPTIONS,
];

const ROADMAP_SORT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "updated_at", label: "Recently updated" },
  { value: "created_at", label: "Recently created" },
  { value: "title", label: "Title" },
] as const;

const FILTER_DEFINITIONS = [
  { param: "tab", options: ["roadmap", "feedback", "changelog"] },
  { param: "productId" },
  {
    param: "status",
    options: ["planned", "in_progress", "completed", "cancelled"],
  },
  { param: "sort", options: ROADMAP_SORTS },
  { param: "projectId" },
  { param: "horizon" },
  { param: "ownerId" },
] as const;

export function RoadmapListPage() {
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const [roadmapCreateOpen, setRoadmapCreateOpen] = useState(false);
  const [changelogCreateOpen, setChangelogCreateOpen] = useState(false);
  const [roadmapItems, setRoadmapItems] = useState<ScorableRoadmapItem[]>([]);
  const [externalEditTarget, setExternalEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const roadmapItemsRef = useRef<ScorableRoadmapItem[]>([]);
  roadmapItemsRef.current = roadmapItems;

  const tabValue = listFilters.value("tab");
  const activeTab: RoadmapTabValue =
    tabValue === "feedback" ? "feedback" : tabValue === "changelog" ? "changelog" : "roadmap";

  const handleTabChange = useCallback((value: string) => {
    listFilters.setValue("tab", value);
  }, [listFilters]);

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

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");
  const productIdValue = listFilters.value("productId");
  const managedProductId = /^\d+$/.test(productIdValue)
    ? Number(productIdValue)
    : undefined;
  const projectIdValue = listFilters.value("projectId");
  const projectId = /^\d+$/.test(projectIdValue) ? Number(projectIdValue) : undefined;
  const horizonValue = listFilters.value("horizon");
  const horizon =
    horizonValue !== BUILD_FILTER_ALL && horizonValue !== ""
      ? horizonValue
      : undefined;
  const ownerIdValue = listFilters.value("ownerId");
  const ownerId = /^\d+$/.test(ownerIdValue) ? Number(ownerIdValue) : undefined;

  const handleRoadmapEditByIndex = useCallback((index: number) => {
    const item = roadmapItemsRef.current[index];
    if (item) setExternalEditTarget(item);
  }, []);

  const handleExternalEditClose = useCallback(() => {
    setExternalEditTarget(null);
  }, []);

  const handleRoadmapItemsChange = useCallback((items: ScorableRoadmapItem[]) => {
    setRoadmapItems(items);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [horizonDraft, setHorizonDraft] = useState(horizon ?? "");
  const { data: membersPage } = useOrgMembers(1, 100);
  const ownerOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "Any owner" },
      ...(membersPage?.data ?? []).map((m) => ({ value: String(m.membershipId), label: getUserDisplayName(m) })),
    ],
    [membersPage],
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
    (value: string) => listFilters.setValue("ownerId", value === BUILD_FILTER_ALL ? "" : value),
    [listFilters],
  );
  const handleHorizonDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setHorizonDraft(event.target.value),
    [],
  );
  const handleHorizonCommit = useCallback(() => {
    listFilters.setValue("horizon", horizonDraft.trim());
  }, [listFilters, horizonDraft]);
  const handleHorizonKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      listFilters.setValue("horizon", horizonDraft.trim());
    },
    [listFilters, horizonDraft],
  );

  const renderRoadmapFilters = useCallback(
    () => (
      <div className="contents">
        <BuildFilterSelect
          label="Status"
          value={statusValue}
          onValueChange={handleStatusFilterChange}
          options={ROADMAP_FILTER_STATUS_OPTIONS}
        />
        <BuildFilterSelect
          label="Sort"
          value={sortValue}
          onValueChange={handleSortFilterChange}
          options={ROADMAP_SORT_OPTIONS}
        />
        <BuildFilterSelect
          label="Owner"
          value={ownerId !== undefined ? String(ownerId) : BUILD_FILTER_ALL}
          onValueChange={handleOwnerFilterChange}
          options={ownerOptions}
        />
        <Input
          value={horizonDraft}
          onChange={handleHorizonDraftChange}
          onBlur={handleHorizonCommit}
          onKeyDown={handleHorizonKeyDown}
          placeholder="Horizon, e.g. Q3 2026"
          aria-label="Filter by horizon"
          className="w-40"
        />
      </div>
    ),
    [
      statusValue,
      sortValue,
      ownerId,
      ownerOptions,
      horizonDraft,
      handleStatusFilterChange,
      handleSortFilterChange,
      handleOwnerFilterChange,
      handleHorizonDraftChange,
      handleHorizonCommit,
      handleHorizonKeyDown,
    ],
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

  const showSearch = activeTab === "roadmap" || activeTab === "feedback";

  const actions = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <RoadmapPublicationActions />
      {activeTab === "roadmap" ? (
        <Button size="sm" className="min-w-0 flex-1 sm:flex-none" onClick={handleOpenRoadmapCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Item
        </Button>
      ) : null}
      {activeTab === "changelog" ? (
        <Button size="sm" className="min-w-0 flex-1 sm:flex-none" onClick={handleOpenChangelogCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Entry
        </Button>
      ) : null}
    </div>
  );

  return (
    <RequireModule module="build">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <PageWrapper
          title="Roadmap"
          subtitle="Plan publicly, collect feedback and ship a changelog"
          actions={actions}
          filters={
            <PageTabsToolbar
              tabsDensity="labeled"
              tabs={
                <TabsList>
                  <TabsTrigger value="roadmap" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Roadmap
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Feedback
                  </TabsTrigger>
                  <TabsTrigger value="changelog" className="gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" />
                    Changelog
                  </TabsTrigger>
                </TabsList>
              }
              filters={activeTab === "roadmap" ? renderRoadmapFilters : undefined}
              search={
                showSearch ? (
                  <SearchInput
                    placeholder="Search…"
                    value={listFilters.search}
                    onValueChange={listFilters.setSearch}
                    ref={searchInputRef}
                  />
                ) : null
              }
            />
          }
        >
          <PmPageShell>
            <PmSection index={0} className={PM_FILL_SECTION}>
              <TabsContent
                value="roadmap"
                className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "overflow-y-auto")}
              >
                <RoadmapTab
                  search={listFilters.debouncedSearch}
                  cursor={listFilters.cursor}
                  onCursorChange={listFilters.setCursor}
                  createOpen={roadmapCreateOpen}
                  onCreateOpenChange={handleRoadmapCreateOpenChange}
                  status={statusValue !== "all" ? statusValue : undefined}
                  managedProductId={managedProductId}
                  sort={sortValue !== "all" ? sortValue : undefined}
                  projectId={projectId}
                  horizon={horizon}
                  ownerId={ownerId}
                  onClearFilters={listFilters.clearAll}
                  onItemsChange={handleRoadmapItemsChange}
                  externalEditTarget={externalEditTarget}
                  onExternalEditClose={handleExternalEditClose}
                />
              </TabsContent>
              <TabsContent
                value="feedback"
                className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "overflow-y-auto")}
              >
                <FeedbackTab
                  search={listFilters.debouncedSearch}
                  cursor={listFilters.cursor}
                  onCursorChange={listFilters.setCursor}
                />
              </TabsContent>
              <TabsContent
                value="changelog"
                className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "overflow-y-auto")}
              >
                <ChangelogTab
                  cursor={listFilters.cursor}
                  onCursorChange={listFilters.setCursor}
                  createOpen={changelogCreateOpen}
                  onCreateOpenChange={handleChangelogCreateOpenChange}
                />
              </TabsContent>
            </PmSection>
          </PmPageShell>
        </PageWrapper>
      </Tabs>
    </RequireModule>
  );
}
