"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import {
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
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

const FILTER_DEFINITIONS = [
  { param: "tab", options: ["roadmap", "feedback", "changelog"] },
] as const;

export function RoadmapListPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? null;
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

  const showSearch = activeTab === "roadmap" || activeTab === "feedback";

  const actions = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {orgId ? (
        <Button asChild variant="outline" size="sm" className="min-w-0 flex-1 sm:flex-none">
          <Link href={`/roadmap/${orgId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Public board
          </Link>
        </Button>
      ) : null}
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

  const hasActions = Boolean(orgId) || activeTab === "roadmap" || activeTab === "changelog";

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
          actions={hasActions ? actions : undefined}
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
                  createOpen={roadmapCreateOpen}
                  onCreateOpenChange={handleRoadmapCreateOpenChange}
                />
              </TabsContent>
              <TabsContent
                value="feedback"
                className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "overflow-y-auto")}
              >
                <FeedbackTab search={listFilters.debouncedSearch} />
              </TabsContent>
              <TabsContent
                value="changelog"
                className={cn(TABS_CONTENT_PAGE_BODY_CLASS, "overflow-y-auto")}
              >
                <ChangelogTab
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
