"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useFindExpert } from "@/lib/api/hooks/hr";
import { Search } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";

export default function FindExpertPage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const { data: experts, isLoading } = useFindExpert(activeQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(query.trim());
  }

  return (
    <PageWrapper
      title="Find Expert"
      subtitle="Search across the org to find colleagues with specific skills"
    >
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. React, Financial Modelling, Python…"
          className="flex-1"
          aria-label="Skill search"
        />
        <Button type="submit" disabled={!query.trim()}>
          <Search className="h-4 w-4 mr-1.5" />
          Search
        </Button>
      </form>

      <div className="mt-6">
        {!activeQuery ? (
          <EmptyState
            illustration={<EmptyPersonIllustration className="h-40 w-40" />}
            title="Search for a skill"
            description="Enter a skill name above to find colleagues who can help."
          />
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !experts || experts.length === 0 ? (
          <EmptyState
            illustration={<EmptyPersonIllustration className="h-40 w-40" />}
            title={`No experts found for "${activeQuery}"`}
            description="Try a different skill or a broader search term."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => (
              <Card key={expert.userId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <Link href={`/hr/employees/${expert.userId}`} className="flex items-center gap-3 group">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={resolveImageUrl(expert.image)} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {(expert.name ?? "?")[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                        {expert.name ?? "Unknown"}
                      </p>
                      {expert.designation && (
                        <p className="text-xs text-muted-foreground truncate">{expert.designation}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {expert.skills.slice(0, 5).map((skill) => (
                      <Badge
                        key={skill}
                        variant={skill.toLowerCase().includes(activeQuery.toLowerCase()) ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {expert.skills.length > 5 && (
                      <Badge variant="outline" className="text-[11px]">
                        +{expert.skills.length - 5}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {experts && experts.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          Found {experts.length} expert{experts.length !== 1 ? "s" : ""} with skills matching &ldquo;{activeQuery}&rdquo;
        </p>
      )}
    </PageWrapper>
  );
}
