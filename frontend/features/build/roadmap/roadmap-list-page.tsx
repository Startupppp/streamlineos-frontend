"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import {
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
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

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

const FILTER_DEFINITIONS = [
  { param: "tab", options: ["roadmap", "feedback", "changelog"] },
  { param: "scope" },
  { param: "productId" },
  { param: "projectId" },
  { param: "status" },
  { param: "horizon" },
  { param: "ownerId" },
  { param: "sort" },
] as const;

export function RoadmapListPage() {
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const [roadmapCreateOpen, setRoadmapCreateOpen] = useState(false);
  const [changelogCreateOpen, setChangelogCreateOpen] = useState(false);

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
  const ownerIdValue = listFilters.value("ownerId");
  const horizonValue = listFilters.value("horizon");
  const sortValue = listFilters.value("sort");

  const handleClearSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: 0,
    onOpen: handleClearSelection,
    onClearSelection: handleClearSelection,
    enabled: activeTab === "roadmap",
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
              search={
                showSearch ? (
                  <SearchInput
                    placeholder="Search…"
                    value={listFilters.search}
                    onValueChange={listFilters.setSearch}
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
                  horizon={horizonValue !== "all" ? horizonValue : undefined}
                  ownerId={ownerIdValue !== "all" ? ownerIdValue : undefined}
                  sort={sortValue !== "all" ? sortValue : undefined}
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
