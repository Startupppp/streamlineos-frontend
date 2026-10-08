"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { useFlushableDebouncedValue } from "@/hooks/common/use-debounce";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useWorkspaceSearchHistory } from "./workspace-search-history";
import { WorkspaceSearchResults } from "./workspace-search-results";

function RecentSearchButton({
  entry,
  onSelect,
}: {
  entry: string;
  onSelect: (entry: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(entry), [entry, onSelect]);
  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Clock3 className="size-3.5" aria-hidden="true" />
      <span className="truncate">{entry}</span>
    </Button>
  );
}

export function WorkspaceSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useSourceOverride(urlQuery, urlQuery);
  const [debouncedQuery, flushSearch] = useFlushableDebouncedValue(
    query.trim(),
    300,
  );
  const { history, remember, clear } = useWorkspaceSearchHistory();

  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    const next = params.toString();
    router.replace(next ? `/build/search?${next}` : "/build/search", {
      scroll: false,
    });
  }, [debouncedQuery, router, searchParams, urlQuery]);

  const handleSubmit = useCallback(() => {
    flushSearch();
    remember(query);
  }, [flushSearch, query, remember]);
  const handleRecentSearch = useCallback(
    (entry: string) => setQuery(entry),
    [setQuery],
  );
  const handleOpenResult = useCallback(
    () => remember(debouncedQuery),
    [debouncedQuery, remember],
  );

  return (
    <PageWrapper
      title="Search Build"
      subtitle="Find the projects, managed products, and tickets you can access."
      contentClassName="py-1"
    >
      <div className="grid min-h-full w-full flex-1 grid-cols-1 content-start gap-5 lg:grid-cols-4">
        <main className="flex min-w-0 flex-col gap-5 lg:col-span-3">
          <SearchInput
            autoFocus
            fill
            value={query}
            onValueChange={setQuery}
            onSubmitSearch={handleSubmit}
            placeholder="Search Build…"
            aria-label="Search Build"
            className="w-full max-w-none"
          />
          <WorkspaceSearchResults
            query={debouncedQuery}
            onOpenResult={handleOpenResult}
          />
        </main>

        <aside
          className="h-fit space-y-3 rounded-xl border bg-card/40 p-4 lg:sticky lg:top-0"
          aria-labelledby="recent-searches-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id="recent-searches-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Recent searches
            </h2>
            {history.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clear}>
                <Trash2 className="size-3.5" aria-hidden="true" />
                Clear
              </Button>
            ) : null}
          </div>
          {history.length > 0 ? (
            <div className="flex flex-col items-stretch gap-2">
              {history.map((entry) => (
                <RecentSearchButton
                  key={entry}
                  entry={entry}
                  onSelect={handleRecentSearch}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Searches you open will be saved here for this workspace.
            </p>
          )}
        </aside>
      </div>
    </PageWrapper>
  );
}
