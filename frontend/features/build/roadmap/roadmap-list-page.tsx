"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { RoadmapTab } from "@/features/build/roadmap/roadmap-tab";
import { FeedbackTab } from "@/features/build/roadmap/feedback-tab";
import { ChangelogTab } from "@/features/build/roadmap/changelog-tab";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

export function RoadmapListPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? null;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [activeTab, setActiveTab] = useState<RoadmapTabValue>("roadmap");
  const [roadmapCreateOpen, setRoadmapCreateOpen] = useState(false);
  const [changelogCreateOpen, setChangelogCreateOpen] = useState(false);

  function handleTabChange(value: string) {
    if (value === "roadmap" || value === "feedback" || value === "changelog") {
      setActiveTab(value);
    }
  }

  function handleOpenRoadmapCreate() {
    setRoadmapCreateOpen(true);
  }

  function handleOpenChangelogCreate() {
    setChangelogCreateOpen(true);
  }

  function handleRoadmapCreateOpenChange(open: boolean) {
    setRoadmapCreateOpen(open);
  }

  function handleChangelogCreateOpenChange(open: boolean) {
    setChangelogCreateOpen(open);
  }

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
        >
          <PmPageShell>
            <PmSection index={0} className={cn(PM_FILL_SECTION, "gap-3")}>
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
                      value={search}
                      onValueChange={setSearch}
                    />
                  ) : null
                }
              />

              <TabsContent value="roadmap" className="mt-0">
                <RoadmapTab
                  search={debouncedSearch}
                  createOpen={roadmapCreateOpen}
                  onCreateOpenChange={handleRoadmapCreateOpenChange}
                />
              </TabsContent>
              <TabsContent value="feedback" className="mt-0">
                <FeedbackTab search={debouncedSearch} />
              </TabsContent>
              <TabsContent value="changelog" className="mt-0">
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
