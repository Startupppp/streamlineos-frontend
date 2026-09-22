"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Archive, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildScopeRow } from "./build-scope-row";
import { useReconciledBuildScopes } from "./use-reconciled-build-scopes";
import {
  useBuildScopeDirectory,
  ORGANIZATION_SCOPE_REF,
  type BuildScopeDirectoryEntry,
} from "./use-build-scope-directory";
import {
  useBuildScopeRecents,
  useBuildScopeStars,
  type BuildScopeRef,
} from "./use-build-nav-preferences";

interface BuildScopeBrowserProps {
  currentScopeKey: string;
  settingsHrefFor: (scope: BuildScopeRef) => string | null;
  onSelect: (scope: BuildScopeRef) => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-2 pb-1 pt-2 text-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
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

  const moveFocus = useCallback((step: number) => {
    const container = listRef.current;
    if (!container) return false;
    const items = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="option"], [role="treeitem"]'),
    ];
    if (items.length === 0) return false;
    const current = items.findIndex((item) => item === document.activeElement);
    const nextIndex =
      current === -1
        ? step > 0
          ? 0
          : items.length - 1
        : (current + step + items.length) % items.length;
    items[nextIndex]?.focus();
    return true;
  }, []);

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

  const handleListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      if (key === "ArrowDown" || key === "ArrowUp") {
        if (moveFocus(key === "ArrowDown" ? 1 : -1)) event.preventDefault();
        return;
      }
      const container = listRef.current;
      if (!container) return;
      if (key === "Home") {
        const first = container.querySelector<HTMLButtonElement>('[role="option"], [role="treeitem"]');
        if (first) { first.focus(); event.preventDefault(); }
        return;
      }
      if (key === "End") {
        const all = container.querySelectorAll<HTMLButtonElement>('[role="option"], [role="treeitem"]');
        const last = all[all.length - 1];
        if (last) { last.focus(); event.preventDefault(); }
        return;
      }
      if (key === "ArrowRight" || key === "ArrowLeft") {
        const focused = document.activeElement as HTMLElement | null;
        if (!focused || !treeRef.current?.contains(focused)) return;
        const scopeKey = focused.dataset["scopeKey"];
        if (!scopeKey) return;
        if (key === "ArrowRight") {
          const hasChildren = childrenOf(scopeKey).length > 0;
          if (hasChildren && !expandedKeys.has(scopeKey)) {
            handleToggleExpanded(scopeKey);
            event.preventDefault();
          } else if (hasChildren && expandedKeys.has(scopeKey)) {
            moveFocus(1);
            event.preventDefault();
          }
        }
        if (key === "ArrowLeft" && expandedKeys.has(scopeKey)) {
          handleToggleExpanded(scopeKey);
          event.preventDefault();
        }
      }
    },
    [moveFocus, expandedKeys, handleToggleExpanded, childrenOf],
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowDown") return;
      if (moveFocus(1)) event.preventDefault();
    },
    [moveFocus],
  );

  const isSearching = search.trim().length > 0;

  const handleToggleArchived = useCallback(
    () => setIncludeArchived((current) => !current),
    [],
  );

  const handleFetchMoreProjects = useCallback(() => {
    directory.fetchMoreProjects();
  }, [directory.fetchMoreProjects]);

  const handleFetchMoreHierarchy = useCallback(() => {
    directory.fetchMoreHierarchy();
  }, [directory.fetchMoreHierarchy]);

  const rootProjects = useMemo(
    () => directory.projects.filter((entry) => entry.parentKey === null),
    [directory.projects],
  );
  const rootProducts = useMemo(
    () => directory.products.filter((entry) => entry.parentKey === null),
    [directory.products],
  );

  const searchResults = useMemo(
    () => [...directory.workspaces, ...directory.products, ...directory.projects],
    [directory.workspaces, directory.products, directory.projects],
  );

  const hasQuarantinedItems =
    directory.quarantinedProducts.length > 0 ||
    directory.quarantinedProjects.length > 0;

  const hasBrowseContent =
    directory.workspaces.length > 0 ||
    rootProducts.length > 0 ||
    rootProjects.length > 0;

  function renderRow(entry: BuildScopeDirectoryEntry, depth: number) {
    const expandable = !isSearching && childrenOf(entry.key).length > 0;
    const expanded = expandedKeys.has(entry.key);
    const handleExpand = () => handleToggleExpanded(entry.key);
    return (
      <div key={entry.key} style={{ paddingLeft: `${depth * 0.75}rem` }}>
        <div className="flex items-center gap-0.5">
          {expandable ? (
            <button
              type="button"
              onClick={handleExpand}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${entry.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground md:h-5 md:w-5"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-150 motion-reduce:transition-none",
                  expanded && "rotate-90",
                )}
              />
            </button>
          ) : (
            <span aria-hidden className="h-11 w-11 shrink-0 md:h-5 md:w-5" />
          )}
          <div className="min-w-0 flex-1">
            <BuildScopeRow
              scope={entry}
              isCurrent={entry.key === currentScopeKey}
              isStarred={isStarred(entry.key)}
              isArchived={entry.isArchived}
              itemRole="treeitem"
              settingsHref={settingsHrefFor(entry)}
              onSelect={onSelect}
              onToggleStar={toggleStar}
            />
          </div>
        </div>
        {expandable && expanded ? (
          <div role="group">
            {childrenOf(entry.key).map(renderChildRow(depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderChildRow(depth: number) {
    return function renderChild(entry: BuildScopeDirectoryEntry) {
      return renderRow(entry, depth);
    };
  }

  function renderRootRow(entry: BuildScopeDirectoryEntry) {
    return renderRow(entry, 0);
  }

  function renderRef(entry: BuildScopeRef) {
    return (
      <BuildScopeRow
        key={entry.key}
        scope={entry}
        isCurrent={entry.key === currentScopeKey}
        isStarred={isStarred(entry.key)}
        settingsHref={settingsHrefFor(entry)}
        onSelect={onSelect}
        onToggleStar={toggleStar}
      />
    );
  }

  function renderBrowseRef(entry: BuildScopeRef) {
    return (
      <BuildScopeRow
        key={entry.key}
        scope={entry}
        isCurrent={entry.key === currentScopeKey}
        isStarred={isStarred(entry.key)}
        itemRole="treeitem"
        settingsHref={settingsHrefFor(entry)}
        onSelect={onSelect}
        onToggleStar={toggleStar}
      />
    );
  }

  function renderSearchRow(entry: BuildScopeDirectoryEntry) {
    return (
      <BuildScopeRow
        key={entry.key}
        scope={entry}
        isCurrent={entry.key === currentScopeKey}
        isStarred={isStarred(entry.key)}
        isArchived={entry.isArchived}
        itemRole="option"
        settingsHref={settingsHrefFor(entry)}
        onSelect={onSelect}
        onToggleStar={toggleStar}
      />
    );
  }

  return (
    <>
      <div
        className="shrink-0 border-b border-border/60 p-2"
        onKeyDown={handleSearchKeyDown}
      >
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search projects, products, workspaces…"
          autoFocus
        />
        <div className="mt-1.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleToggleArchived}
            aria-pressed={includeArchived}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-micro font-medium transition-colors motion-reduce:transition-none",
              includeArchived
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Archive className="h-3 w-3" />
            Include archived
          </button>
          {directory.isRefreshing ? (
            <Loader2
              className="h-3 w-3 animate-spin text-muted-foreground motion-reduce:animation-none"
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
              searchResults.map(renderSearchRow)
            )}
            {directory.hasMoreHierarchy ? (
              <div className="flex justify-center py-1">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  type="button"
                  isPending={directory.isFetchingMoreHierarchy}
                  onClick={handleFetchMoreHierarchy}
                >
                  Load more workspaces / products
                </LoadingButton>
              </div>
            ) : null}
            {directory.hasMoreProjects ? (
              <div className="flex justify-center py-1">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  type="button"
                  isPending={directory.isFetchingMoreProjects}
                  onClick={handleFetchMoreProjects}
                >
                  Load more projects
                </LoadingButton>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-1.5">
            {liveStarred.length > 0 ? (
              <>
                <SectionLabel>Starred</SectionLabel>
                <div role="listbox" aria-label="Starred scopes">
                  {liveStarred.map(renderRef)}
                </div>
              </>
            ) : null}

            {liveRecents.length > 0 ? (
              <>
                <SectionLabel>Recent</SectionLabel>
                <div role="listbox" aria-label="Recent scopes">
                  {liveRecents.map(renderRef)}
                </div>
              </>
            ) : null}

            <SectionLabel>Browse</SectionLabel>
            <div role="tree" aria-label="Build scopes" ref={treeRef}>
              {renderBrowseRef(ORGANIZATION_SCOPE_REF)}
              {directory.workspaces.map(renderRootRow)}
              {rootProducts.map(renderRootRow)}
              {rootProjects.map(renderRootRow)}
            </div>

            {directory.hasMoreHierarchy ? (
              <div className="flex justify-center py-1">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  type="button"
                  isPending={directory.isFetchingMoreHierarchy}
                  onClick={handleFetchMoreHierarchy}
                >
                  Load more workspaces / products
                </LoadingButton>
              </div>
            ) : null}

            {directory.hasMoreProjects ? (
              <div className="flex justify-center py-1">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  type="button"
                  isPending={directory.isFetchingMoreProjects}
                  onClick={handleFetchMoreProjects}
                >
                  Load more projects
                </LoadingButton>
              </div>
            ) : null}

            {!hasBrowseContent && !hasQuarantinedItems ? (
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
                  {directory.quarantinedProducts.map(renderRootRow)}
                  {directory.quarantinedProjects.map(renderRootRow)}
                </div>
              </>
            ) : null}
          </div>
        )}
      </ScrollArea>

    </>
  );
}
