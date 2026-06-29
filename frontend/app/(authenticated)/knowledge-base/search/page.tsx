"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { SearchResultCard } from "@/components/kb/search-result-card";
import { useKbSearch, useKbSpaces } from "@/hooks/api/kb";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getApiError } from "@/lib/api-client";

export default function KnowledgeBaseSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(urlQuery);
  const [page, setPage] = useState(1);
  const [pagedQuery, setPagedQuery] = useState(urlQuery);
  const debouncedValue = useDebouncedValue(inputValue.trim(), 300);

  if (pagedQuery !== urlQuery) {
    setPagedQuery(urlQuery);
    setPage(1);
  }

  useEffect(() => {
    if (debouncedValue === urlQuery) return;
    const params = new URLSearchParams();
    if (debouncedValue) params.set("q", debouncedValue);
    const queryString = params.toString();
    router.replace(
      queryString
        ? `/knowledge-base/search?${queryString}`
        : "/knowledge-base/search",
    );
  }, [debouncedValue, urlQuery, router]);

  const searchQuery = useKbSearch({ q: urlQuery, page });
  const spacesQuery = useKbSpaces();

  const spaceNameById = useMemo(() => {
    const map = new Map<number, string>();
    (spacesQuery.data ?? []).forEach((space) => map.set(space.id, space.name));
    return map;
  }, [spacesQuery.data]);

  const results = searchQuery.data;
  const askHref = `/knowledge-base/ask?q=${encodeURIComponent(urlQuery)}`;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
  }

  function handleRetry() {
    void searchQuery.refetch();
  }

  function handlePrevPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function handleNextPage() {
    setPage((current) => Math.min(results?.totalPages ?? 1, current + 1));
  }

  function renderBody() {
    if (!urlQuery) {
      return (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="Search the knowledge base"
          description="Type a question or keyword to find articles across every space."
          className="min-h-[55vh]"
        />
      );
    }

    if (searchQuery.isLoading) {
      return <LoadingState variant="list" className="p-0" rows={6} />;
    }

    if (searchQuery.isError) {
      return (
        <ErrorState
          description={getApiError(searchQuery.error)}
          onRetry={handleRetry}
          className="min-h-[55vh]"
        />
      );
    }

    if (!results || results.items.length === 0) {
      return (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title={`No results for “${urlQuery}”`}
          description="We couldn't find any articles matching your search. Try asking AI instead."
          action={{ label: "Ask AI instead", href: askHref }}
          className="min-h-[55vh]"
        />
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-2">
          {results.items.map((result) => (
            <SearchResultCard
              key={result.id}
              result={result}
              spaceName={
                result.spaceId !== null
                  ? spaceNameById.get(result.spaceId)
                  : undefined
              }
            />
          ))}
        </div>

        {results.totalPages > 1 && (
          <div className="mt-3 flex shrink-0 items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Page {results.page} of {results.totalPages} · {results.total}{" "}
              results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={results.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={results.page >= results.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Search"
      subtitle="Find articles across every space in your workspace."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href={askHref}>Ask AI</Link>
        </Button>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={inputValue}
            onChange={handleSearchChange}
            placeholder="Search the knowledge base…"
            aria-label="Search the knowledge base"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1">{renderBody()}</div>
      </div>
    </PageWrapper>
  );
}
