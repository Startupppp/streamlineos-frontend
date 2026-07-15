"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, MessageSquare, Megaphone, Plus, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmapTab } from "@/features/projects/roadmap/roadmap-tab";
import { FeedbackTab } from "@/features/projects/roadmap/feedback-tab";
import { ChangelogTab } from "@/features/projects/roadmap/changelog-tab";
import {
  PmPageShell,
  PmSection,
} from "@/features/projects/shared/pm-chrome";

type RoadmapTabValue = "roadmap" | "feedback" | "changelog";

export default function RoadmapPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? null;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [activeTab, setActiveTab] = useState<RoadmapTabValue>("roadmap");
  const [roadmapCreateOpen, setRoadmapCreateOpen] = useState(false);
  const [changelogCreateOpen, setChangelogCreateOpen] = useState(false);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

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
    <div className="flex items-center gap-2">
      {orgId ? (
        <Button asChild variant="outline" size="sm" className="h-8">
          <Link href={`/roadmap/${orgId}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Public board
          </Link>
        </Button>
      ) : null}
      {activeTab === "roadmap" ? (
        <Button size="sm" className="h-8" onClick={handleOpenRoadmapCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Item
        </Button>
      ) : null}
      {activeTab === "changelog" ? (
        <Button size="sm" className="h-8" onClick={handleOpenChangelogCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Entry
        </Button>
      ) : null}
    </div>
  );

  const hasActions = Boolean(orgId) || activeTab === "roadmap" || activeTab === "changelog";

  return (
    <RequireModule module="PROJECTS">
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
            <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-3">
              <TabsList className="shrink-0">
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

              {showSearch ? (
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={handleSearchChange}
                    className="h-8 w-full text-xs sm:w-56 border-input bg-card"
                  />
                </div>
              ) : null}

              <TabsContent value="roadmap" className="mt-0 flex min-h-0 flex-1 flex-col">
                <RoadmapTab
                  search={debouncedSearch}
                  createOpen={roadmapCreateOpen}
                  onCreateOpenChange={handleRoadmapCreateOpenChange}
                />
              </TabsContent>
              <TabsContent value="feedback" className="mt-0 flex min-h-0 flex-1 flex-col">
                <FeedbackTab search={debouncedSearch} />
              </TabsContent>
              <TabsContent value="changelog" className="mt-0 flex min-h-0 flex-1 flex-col">
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
