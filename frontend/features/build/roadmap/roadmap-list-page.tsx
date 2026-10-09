"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
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
import { FeedbackTab } from "@/features/build/roadmap/feedback-tab";
import { ChangelogTab } from "@/features/build/roadmap/changelog-tab";
import { RoadmapPublicationActions } from "@/features/build/roadmap/roadmap-publication-actions";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import {
  ROADMAP_FILTER_STATUS_OPTIONS,
  ROADMAP_SORT_OPTIONS,
  FILTER_DEFINITIONS,
} from "./roadmap-list-page-model";
import { useRoadmapListPage } from "./use-roadmap-list-page";
import { RoadmapFilters } from "./roadmap-filters";

export function RoadmapListPage() {
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const {
    activeTab,
    roadmapCreateOpen,
    changelogCreateOpen,
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
    handleExternalEditClose,
    handleRoadmapItemsChange,
    handleStatusFilterChange,
    handleSortFilterChange,
    handleOwnerFilterChange,
    handleHorizonCommit,
  } = useRoadmapListPage(listFilters);

  const activeRoadmapFilterCount = [
    "productId",
    "status",
    "sort",
    "projectId",
    "horizon",
    "ownerId",
  ].filter((param) => listFilters.isActive(param)).length;

  const roadmapFilters = (
    <RoadmapFilters
      activeFilterCount={activeRoadmapFilterCount}
      statusValue={statusValue}
      sortValue={sortValue}
      ownerValue={ownerId !== undefined ? String(ownerId) : BUILD_FILTER_ALL}
      horizonValue={horizon ?? ""}
      statusOptions={ROADMAP_FILTER_STATUS_OPTIONS}
      sortOptions={ROADMAP_SORT_OPTIONS}
      ownerOptions={ownerOptions}
      onStatusChange={handleStatusFilterChange}
      onSortChange={handleSortFilterChange}
      onOwnerChange={handleOwnerFilterChange}
      onHorizonCommit={handleHorizonCommit}
      onClear={listFilters.clearAll}
    />
  );

  const showSearch = activeTab === "roadmap" || activeTab === "feedback";

  const actions = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <RoadmapPublicationActions />
      {activeTab === "roadmap" ? (
        <Button
          size="sm"
          className="min-w-0 flex-1 sm:flex-none"
          onClick={handleOpenRoadmapCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          New Item
        </Button>
      ) : null}
      {activeTab === "changelog" ? (
        <Button
          size="sm"
          className="min-w-0 flex-1 sm:flex-none"
          onClick={handleOpenChangelogCreate}
        >
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
              filters={activeTab === "roadmap" ? roadmapFilters : undefined}
              filtersAlwaysVisible
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
