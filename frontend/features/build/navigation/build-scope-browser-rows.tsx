"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuildScopeRow } from "./build-scope-row";
import type { BuildScopeDirectoryEntry } from "./use-build-scope-directory";
import type { BuildScopeRef } from "./build-nav-storage";

export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-2 pb-1 pt-2 text-micro font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

interface RowSharedProps {
  currentScopeKey: string;
  isStarred: (key: string) => boolean;
  settingsHrefFor: (scope: BuildScopeRef) => string | null;
  onSelect: (scope: BuildScopeRef) => void;
  onToggleStar: (scope: BuildScopeRef) => void;
}

interface ScopeTreeRowProps extends RowSharedProps {
  entry: BuildScopeDirectoryEntry;
  depth: number;
  isSearching: boolean;
  expandedKeys: ReadonlySet<string>;
  childrenOf: (key: string) => BuildScopeDirectoryEntry[];
  onToggleExpanded: (key: string) => void;
}

export function ScopeTreeRow({
  entry,
  depth,
  currentScopeKey,
  isStarred,
  settingsHrefFor,
  onSelect,
  onToggleStar,
  isSearching,
  expandedKeys,
  childrenOf,
  onToggleExpanded,
}: ScopeTreeRowProps) {
  const expandable = !isSearching && childrenOf(entry.key).length > 0;
  const expanded = expandedKeys.has(entry.key);
  const children = childrenOf(entry.key);

  function handleExpand() {
    onToggleExpanded(entry.key);
  }

  return (
    <div style={{ paddingLeft: `${depth * 0.75}rem` }}>
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
            onToggleStar={onToggleStar}
          />
        </div>
      </div>
      {expandable && expanded ? (
        <div role="group">
          {children.map((child) => (
            <ScopeTreeRow
              key={child.key}
              entry={child}
              depth={depth + 1}
              currentScopeKey={currentScopeKey}
              isStarred={isStarred}
              settingsHrefFor={settingsHrefFor}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              isSearching={isSearching}
              expandedKeys={expandedKeys}
              childrenOf={childrenOf}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ScopeFlatRowProps extends RowSharedProps {
  scope: BuildScopeRef;
  itemRole?: "treeitem" | "option";
  isArchived?: boolean;
}

export function ScopeFlatRow({
  scope,
  currentScopeKey,
  isStarred,
  settingsHrefFor,
  onSelect,
  onToggleStar,
  itemRole,
  isArchived,
}: ScopeFlatRowProps) {
  return (
    <BuildScopeRow
      scope={scope}
      isCurrent={scope.key === currentScopeKey}
      isStarred={isStarred(scope.key)}
      isArchived={isArchived}
      itemRole={itemRole}
      settingsHref={settingsHrefFor(scope)}
      onSelect={onSelect}
      onToggleStar={onToggleStar}
    />
  );
}
