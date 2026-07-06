"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, MessageSquare, Megaphone, Sparkles } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmapTab } from "@/features/projects/roadmap/roadmap-tab";
import { FeedbackTab } from "@/features/projects/roadmap/feedback-tab";
import { ChangelogTab } from "@/features/projects/roadmap/changelog-tab";

export default function RoadmapPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? null;
  const [search, setSearch] = useState("");

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  const filters = (
    <Input
      placeholder="Search…"
      value={search}
      onChange={handleSearchChange}
      className="h-8 text-xs w-full sm:w-64"
    />
  );

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Roadmap"
        eyebrow="Projects"
        subtitle="Plan publicly, collect feedback and ship a changelog"
        filters={filters}
        actions={
          orgId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/roadmap/${orgId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Public board
              </Link>
            </Button>
          ) : undefined
        }
      >
        <Tabs defaultValue="roadmap" className="gap-4">
          <TabsList>
            <TabsTrigger value="roadmap">
              <Sparkles className="h-4 w-4" /> Roadmap
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="h-4 w-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="changelog">
              <Megaphone className="h-4 w-4" /> Changelog
            </TabsTrigger>
          </TabsList>
          <TabsContent value="roadmap">
            <RoadmapTab search={search} />
          </TabsContent>
          <TabsContent value="feedback">
            <FeedbackTab search={search} />
          </TabsContent>
          <TabsContent value="changelog">
            <ChangelogTab />
          </TabsContent>
        </Tabs>
      </PageWrapper>
    </RequireModule>
  );
}
