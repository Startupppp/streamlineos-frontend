"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { SpaceCard } from "@/components/kb/space-card";
import { CreateSpaceSheet } from "@/components/kb/create-space-sheet";
import { useKbSpaces } from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";

export default function KnowledgeBaseHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const spacesQuery = useKbSpaces();
  const spaces = spacesQuery.data ?? [];

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/knowledge-base/search?q=${encodeURIComponent(query)}`);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleRetry() {
    spacesQuery.refetch();
  }

  return (
    <PageWrapper
      title="Knowledge Base"
      subtitle="Browse spaces and search across every article in your workspace."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New space
        </Button>
      }
    >
      <form onSubmit={handleSearchSubmit} className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search the knowledge base…"
          aria-label="Search the knowledge base"
          className="pl-9"
        />
      </form>

      {spacesQuery.isLoading ? (
        <LoadingState variant="cards" rows={6} className="p-0" />
      ) : spacesQuery.error ? (
        <ErrorState
          description={getApiError(spacesQuery.error)}
          onRetry={handleRetry}
          className="min-h-[55vh]"
        />
      ) : spaces.length === 0 ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration />}
          title="No spaces yet"
          description="Create your first knowledge base space to start organising articles."
          action={{ label: "New space", onClick: handleOpenCreate }}
          className="min-h-[55vh]"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}

      <CreateSpaceSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
