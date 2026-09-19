"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Archive, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
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
    const options = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    ];
    if (options.length === 0) return false;
    const current = options.findIndex((option) => option === document.activeElement);
    const nextIndex =
      current === -1
        ? step > 0
          ? 0
          : options.length - 1
        : (current + step + options.length) % options.length;
    options[nextIndex]?.focus();
    return true;
  }, []);

  const handleListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (moveFocus(event.key === "ArrowDown" ? 1 : -1)) event.preventDefault();
    },
    [moveFocus],
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
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform duration-150 motion-reduce:transition-none",
                    expanded && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <span aria-hidden className="h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <BuildScopeRow
                scope={entry}
                isCurrent={entry.key === currentScopeKey}
                isStarred={isStarred(entry.key)}
                isArchived={entry.isArchived}
                settingsHref={settingsHrefFor(entry)}
                onSelect={onSelect}
                onToggleStar={toggleStar}
              />
            </div>
          </div>
          {expandable && expanded
            ? childrenOf(entry.key).map(renderChildRow(depth + 1))
            : null}
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
        <button
          type="button"
          onClick={handleToggleArchived}
          aria-pressed={includeArchived}
          className={cn(
            "mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-micro font-medium transition-colors",
            includeArchived
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Archive className="h-3 w-3" />
          Include archived
        </button>
      </div>

      <ScrollArea
        className="max-h-80 min-h-0 flex-1"
        viewportRef={listRef}
        onKeyDown={handleListKeyDown}
      >
        {directory.isError ? (
          <ErrorState
            className="border-0 bg-transparent"
            title="Couldn't load your Build scopes"
            onRetry={directory.refetch}
          />
        ) : directory.isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : isSearching ? (
          <div className="p-1.5" role="listbox" aria-label="Scope search results">
            {searchResults.length === 0 ? (
              <EmptyState
                className="min-h-0 border-0 bg-transparent py-6"
                title="No matching scopes"
                description="Try another name, key, or include archived scopes."
              />
            ) : (
              searchResults.map(renderRootRow)
            )}
          </div>
        ) : (
          <div className="p-1.5" role="listbox" aria-label="Build scopes">
            {liveStarred.length > 0 ? (
              <>
                <SectionLabel>Starred</SectionLabel>
                {liveStarred.map(renderRef)}
              </>
            ) : null}

            {liveRecents.length > 0 ? (
              <>
                <SectionLabel>Recent</SectionLabel>
                {liveRecents.map(renderRef)}
              </>
            ) : null}

            <SectionLabel>Browse</SectionLabel>
            {renderRef(ORGANIZATION_SCOPE_REF)}
            {directory.workspaces.map(renderRootRow)}
            {rootProducts.map(renderRootRow)}
            {rootProjects.map(renderRootRow)}

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
                {directory.quarantinedProducts.map(renderRootRow)}
                {directory.quarantinedProjects.map(renderRootRow)}
              </>
            ) : null}
          </div>
        )}
      </ScrollArea>

      {directory.hasMoreProjects || directory.hasMoreHierarchy ? (
        <>
          <Separator />
          <p className="shrink-0 px-3 py-2 text-micro text-muted-foreground">
            Showing the first {directory.hasMoreProjects ? "projects" : "workspaces or products"} only. Search to find any scope you can access.
          </p>
        </>
      ) : null}
    </>
  );
}
