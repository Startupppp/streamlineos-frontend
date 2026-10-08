"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Archive, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useReconciledBuildScopes } from "./use-reconciled-build-scopes";
import {
  useBuildScopeDirectory,
  ORGANIZATION_SCOPE_REF,
  type BuildScopeDirectoryEntry,
} from "./use-build-scope-directory";
import {
  useBuildScopeRecents,
  useBuildScopeStars,
} from "./use-build-nav-preferences";
import type { BuildScopeRef } from "./build-nav-storage";
import { useBuildScopeBrowserKeyboard } from "./use-build-scope-browser-keyboard";
import {
  SectionLabel,
  ScopeTreeRow,
  ScopeFlatRow,
} from "./build-scope-browser-rows";

interface BuildScopeBrowserProps {
  currentScopeKey: string;
  settingsHrefFor: (scope: BuildScopeRef) => string | null;
  onSelect: (scope: BuildScopeRef) => void;
}

export function BuildScopeBrowser({
  currentScopeKey,
  settingsHrefFor,
  onSelect,
}: BuildScopeBrowserProps) {
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const treeRef = useRef<HTMLDivElement>(null);
  const recentsStore = useBuildScopeRecents();
  const liveRecents = useReconciledBuildScopes(
    recentsStore.recents,
    recentsStore.replaceRecents,
  ).entries;
  const stars = useBuildScopeStars();
  const { isStarred, toggleStar } = stars;
  const liveStarred = useReconciledBuildScopes(
    stars.starred,
    stars.replaceStarred,
  ).entries;
  const directory = useBuildScopeDirectory(search, includeArchived);
  const listRef = useRef<HTMLDivElement>(null);

  const handleToggleExpanded = useCallback((scopeKey: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(scopeKey)) next.delete(scopeKey);
      else next.add(scopeKey);
      return next;
    });
  }, []);

  const childrenOf = useCallback(
    (parentKey: string): BuildScopeDirectoryEntry[] => [
      ...directory.products.filter((entry) => entry.parentKey === parentKey),
      ...directory.projects.filter((entry) => entry.parentKey === parentKey),
    ],
    [directory.products, directory.projects],
  );

  const { handleListKeyDown, handleSearchKeyDown } =
    useBuildScopeBrowserKeyboard({
      listRef,
      treeRef,
      expandedKeys,
      onToggleExpanded: handleToggleExpanded,
      childrenOf,
      directoryProducts: directory.products,
      directoryProjects: directory.projects,
    });

  const isSearching = search.trim().length > 0;

  const handleToggleArchived = useCallback(() => setIncludeArchived((c) => !c), []);

  const rootProjects = useMemo(
    () => directory.projects.filter((entry) => entry.parentKey === null),
    [directory.projects],
  );
  const rootProducts = useMemo(
    () => directory.products.filter((entry) => entry.parentKey === null),
    [directory.products],
  );

  const searchResults = useMemo(
    () => [...directory.products, ...directory.projects],
    [directory.products, directory.projects],
  );

  const rowProps = useMemo(
    () => ({
      currentScopeKey,
      isStarred,
      settingsHrefFor,
      onSelect,
      onToggleStar: toggleStar,
    }),
    [currentScopeKey, isStarred, settingsHrefFor, onSelect, toggleStar],
  );

  const treeRowProps = useMemo(
    () => ({
      ...rowProps,
      isSearching,
      expandedKeys,
      childrenOf,
      onToggleExpanded: handleToggleExpanded,
    }),
    [rowProps, isSearching, expandedKeys, childrenOf, handleToggleExpanded],
  );

  const hasQuarantinedItems = directory.quarantinedProjects.length > 0;

  return (
    <>
      <div
        className="shrink-0 border-b border-border/60 p-2"
        onKeyDown={handleSearchKeyDown}
      >
        <div className="flex items-center gap-1.5">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search projects and products"
            autoFocus
            className="min-w-0 flex-1"
          />
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleToggleArchived}
                  aria-label="Include archived"
                  aria-pressed={includeArchived}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors motion-reduce:transition-none",
                    includeArchived
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Archive className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="text-xs font-medium">
                Include archived
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {directory.isRefreshing ? (
            <Loader2
              className="size-3 shrink-0 animate-spin text-muted-foreground motion-reduce:animation-none"
              aria-label="Refreshing scopes"
            />
          ) : null}
        </div>
      </div>

      <ScrollArea
        className="max-h-80 min-h-0 flex-1"
        viewportRef={listRef}
        onKeyDown={handleListKeyDown}
      >
        {directory.isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : directory.isDenied ? (
          <NoPermissionState
            compact
            permission="build:view"
            title="Build access required"
            description="Ask your admin for access to Build scopes."
          />
        ) : directory.isError ? (
          <ErrorState
            className="border-0 bg-transparent"
            title="Couldn't load your Build scopes"
            onRetry={directory.refetch}
          />
        ) : isSearching ? (
          <div className="p-1.5" role="listbox" aria-label="Scope search results">
            {searchResults.length === 0 ? (
              <EmptyState
                className="min-h-0 border-0 bg-transparent py-6"
                title="No matching scopes"
                description="Try another name, key, or include archived scopes."
              />
            ) : (
              searchResults.map((entry) => (
                <ScopeFlatRow
                  key={entry.key}
                  scope={entry}
                  itemRole="option"
                  isArchived={entry.isArchived}
                  {...rowProps}
                />
              ))
            )}
            <InfiniteScrollSentinel
              hasNextPage={directory.hasMoreSearchResults}
              isFetchingNextPage={directory.isFetchingMoreSearchResults}
              onLoadMore={directory.fetchMoreSearchResults}
              label="Load more results"
            />
          </div>
        ) : (
          <div className="p-1.5">
            {liveStarred.length > 0 ? (
              <>
                <SectionLabel>Starred</SectionLabel>
                <div role="listbox" aria-label="Starred scopes">
                  {liveStarred.map((entry) => (
                    <ScopeFlatRow key={entry.key} scope={entry} {...rowProps} />
                  ))}
                </div>
              </>
            ) : null}

            {liveRecents.length > 0 ? (
              <>
                <SectionLabel>Recent</SectionLabel>
                <div role="listbox" aria-label="Recent scopes">
                  {liveRecents.map((entry) => (
                    <ScopeFlatRow key={entry.key} scope={entry} {...rowProps} />
                  ))}
                </div>
              </>
            ) : null}

            <SectionLabel>Browse</SectionLabel>
            <div role="tree" aria-label="Build scopes" ref={treeRef}>
              <ScopeFlatRow scope={ORGANIZATION_SCOPE_REF} itemRole="treeitem" {...rowProps} />
              {rootProducts.map((entry) => (
                <ScopeTreeRow key={entry.key} entry={entry} depth={0} {...treeRowProps} />
              ))}
              {rootProjects.map((entry) => (
                <ScopeTreeRow key={entry.key} entry={entry} depth={0} {...treeRowProps} />
              ))}
            </div>

            <InfiniteScrollSentinel
              hasNextPage={directory.hasMoreHierarchy}
              isFetchingNextPage={directory.isFetchingMoreHierarchy}
              onLoadMore={directory.fetchMoreHierarchy}
              label="Load more products"
            />

            <InfiniteScrollSentinel
              hasNextPage={directory.hasMoreProjects}
              isFetchingNextPage={directory.isFetchingMoreProjects}
              onLoadMore={directory.fetchMoreProjects}
              label="Load more projects"
            />

            {rootProducts.length === 0 && rootProjects.length === 0 && !hasQuarantinedItems ? (
              <EmptyState
                className="min-h-0 border-0 bg-transparent py-6"
                title="No accessible Build scopes"
                description="Create a project or ask an admin for access to one."
              />
            ) : null}

            {hasQuarantinedItems ? (
              <>
                <Separator className="my-1" />
                <SectionLabel>Hierarchy issues</SectionLabel>
                <div role="tree" aria-label="Hierarchy issue scopes">
                  {directory.quarantinedProjects.map((entry) => (
                    <ScopeTreeRow key={entry.key} entry={entry} depth={0} {...treeRowProps} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </ScrollArea>
    </>
  );
}
