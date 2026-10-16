"use client";

import React, { useState } from "react";
import {
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
} from "@animateicons/react/lucide";
import {
  StickyNote,
  Loader2,
  Check,
  ShieldCheck,
  UserIcon,
  Layers,
  FileText,
} from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { ErrorReference } from "@/components/shared/error-reference";
import { cn } from "@/lib/utils";
import type { KbSource } from "@/hooks/api/kb/sources";
import type { KbPageSearchResult } from "@/hooks/api/kb/page-types";
import { KB_ASK_STATUS_SCOPES, type KbAskStatusScope } from "@/hooks/api/kb/ask";

interface KbSourcesSheetManageProps {
  mode: "manage";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: KbSource[];
  isLoading: boolean;
  sourceError: unknown;
  sourceHasMore: boolean;
  sourceIsFetchingMore: boolean;
  onSourceLoadMore: () => void;
  onSourceRetry: () => void;
  readyCount: number;
  onUploadClick: () => void;
  uploadPending: boolean;
  onAddNoteClick: () => void;
  makeDeleteHandler: (id: number) => () => void;
  deletingId: number | undefined;
  isDeleting: boolean;
}

export type SpaceIdFilter = number | null;

export type OwnerMembershipFilter = number | null;

export type StatusScopeFilter = KbAskStatusScope | null;

interface KbSourcesSheetScopeProps {
  mode: "scope";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: KbSource[];
  isLoading: boolean;
  sourceError: unknown;
  sourceHasMore: boolean;
  sourceIsFetchingMore: boolean;
  onSourceLoadMore: () => void;
  onSourceRetry: () => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
  currentUserId?: string;
  kindFilter: SourceKindFilter;
  onKindFilterChange: (kind: SourceKindFilter) => void;
  ownerFilter: OwnerFilter;
  onOwnerFilterChange: (owner: OwnerFilter) => void;
  spaceIdFilter: SpaceIdFilter;
  onSpaceIdFilterChange: (spaceId: SpaceIdFilter) => void;
  spaces: ReadonlyArray<{ id: number; name: string }>;
  ownerMembershipId: OwnerMembershipFilter;
  onOwnerMembershipIdChange: (ownerMembershipId: OwnerMembershipFilter) => void;
  owners: ReadonlyArray<{
    membershipId: number;
    name: string;
  }>;
  selectedOwner: { membershipId: number; name: string } | null;
  onOwnerSearchChange: (search: string) => void;
  ownersAreLoading: boolean;
  ownersHasMore: boolean;
  ownersAreFetchingMore: boolean;
  onOwnersLoadMore: () => void;
  ownersError: unknown;
  onOwnersRetry: () => void;
  statusScope: StatusScopeFilter;
  onStatusScopeChange: (status: StatusScopeFilter) => void;
  onConfirm: () => void;
  pageSearchQuery: string;
  onPageSearchQueryChange: (q: string) => void;
  pageSearchResults: KbPageSearchResult[];
  pageSearchIsLoading: boolean;
  selectedPageIds: number[];
  onPageSelectionChange: (ids: number[]) => void;
}

export type KbSourcesSheetProps =
  | KbSourcesSheetManageProps
  | KbSourcesSheetScopeProps;

export function KbSourcesSheet(props: KbSourcesSheetProps) {
  if (props.mode === "scope") {
    return <KbSourcesScopeSheet {...props} />;
  }
  return <KbSourcesManageSheet {...props} />;
}

function KbSourcesManageSheet({
  open,
  onOpenChange,
  sources,
  isLoading,
  sourceError,
  sourceHasMore,
  sourceIsFetchingMore,
  onSourceLoadMore,
  onSourceRetry,
  readyCount,
  onUploadClick,
  uploadPending,
  onAddNoteClick,
  makeDeleteHandler,
  deletingId,
  isDeleting,
}: Omit<KbSourcesSheetManageProps, "mode">) {
  const description =
    sources.length > 0
      ? `${readyCount} of ${sources.length} sources ready for AI answers`
      : "Upload files or add notes to ground answers on your content.";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sources"
      description={description}
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onUploadClick}
            disabled={uploadPending}
          >
            <UploadIcon size={14} />
            {uploadPending ? "Uploading…" : "Upload"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onAddNoteClick}
          >
            <PlusIcon size={14} />
            Note
          </Button>
        </div>

        {sourceError && sources.length === 0 ? (
          <SourceReadError error={sourceError} onRetry={onSourceRetry} />
        ) : (
          <SourcesList
            isLoading={isLoading}
            sources={sources}
            makeDeleteHandler={makeDeleteHandler}
            deletingId={deletingId}
            isDeleting={isDeleting}
          />
        )}
        <SourcePagination
          error={sources.length > 0 ? sourceError : null}
          hasMore={sourceHasMore}
          isFetchingMore={sourceIsFetchingMore}
          onLoadMore={onSourceLoadMore}
          onRetry={onSourceRetry}
        />
      </div>
    </AppSheet>
  );
}

const SOURCE_KINDS = ["all", "file", "note"] as const;
export type SourceKindFilter = (typeof SOURCE_KINDS)[number];

const KIND_LABELS: Record<SourceKindFilter, string> = {
  all: "All",
  file: "Files",
  note: "Notes",
};

function KindFilterButton({
  kind,
  active,
  onSelect,
}: {
  kind: SourceKindFilter;
  active: boolean;
  onSelect: (kind: SourceKindFilter) => void;
}) {
  function handleClick() {
    onSelect(kind);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {KIND_LABELS[kind]}
    </button>
  );
}

const PAGE_SEARCH_SKELETON_KEYS = ["page-search-skeleton-a", "page-search-skeleton-b"] as const;

const OWNER_FILTERS = ["all", "mine"] as const;
export type OwnerFilter = (typeof OWNER_FILTERS)[number];

const OWNER_LABELS: Record<OwnerFilter, string> = { all: "All", mine: "Mine" };

function OwnerFilterButton({
  owner,
  active,
  onSelect,
}: {
  owner: OwnerFilter;
  active: boolean;
  onSelect: (owner: OwnerFilter) => void;
}) {
  function handleClick() {
    onSelect(owner);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {OWNER_LABELS[owner]}
    </button>
  );
}

function SpaceFilterButton({
  spaceId,
  label,
  active,
  onSelect,
}: {
  spaceId: SpaceIdFilter;
  label: string;
  active: boolean;
  onSelect: (spaceId: SpaceIdFilter) => void;
}) {
  function handleClick() {
    onSelect(spaceId);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function statusScopeLabel(status: KbAskStatusScope): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function StatusScopeButton({
  status,
  label,
  active,
  onSelect,
}: {
  status: StatusScopeFilter;
  label: string;
  active: boolean;
  onSelect: (status: StatusScopeFilter) => void;
}) {
  function handleClick() {
    onSelect(status);
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function OwnerMembershipSelect({
  ownerMembershipId,
  onOwnerMembershipIdChange,
  owners,
  selectedOwner,
  onOwnerSearchChange,
  ownersAreLoading,
  ownersHasMore,
  ownersAreFetchingMore,
  onOwnersLoadMore,
  ownersError,
  onOwnersRetry,
}: Pick<
  KbSourcesSheetScopeProps,
  | "ownerMembershipId"
  | "onOwnerMembershipIdChange"
  | "owners"
  | "selectedOwner"
  | "onOwnerSearchChange"
  | "ownersAreLoading"
  | "ownersHasMore"
  | "ownersAreFetchingMore"
  | "onOwnersLoadMore"
  | "ownersError"
  | "onOwnersRetry"
>) {
  const [lastSelectedOwner, setLastSelectedOwner] = useState<{ membershipId: number; name: string } | null>(null);
  const selected = owners.find((owner) => owner.membershipId === ownerMembershipId)
    ?? (selectedOwner?.membershipId === ownerMembershipId ? selectedOwner : null)
    ?? (lastSelectedOwner?.membershipId === ownerMembershipId ? lastSelectedOwner : null);
  const choices = selected && !owners.some((owner) => owner.membershipId === selected.membershipId)
    ? [selected, ...owners]
    : owners;
  const options = choices.map((owner) => ({
    value: String(owner.membershipId),
    label: owner.name,
  }));

  function handleChange(value: string, label?: string) {
    if (value !== "" && label) setLastSelectedOwner({ membershipId: Number(value), name: label });
    onOwnerMembershipIdChange(value === "" ? null : Number(value));
  }

  function handleClear() {
    onOwnerMembershipIdChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Page owner
        </span>
        {ownerMembershipId !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleClear}
          >
            Any owner
          </Button>
        )}
      </div>
      <Combobox
        options={options}
        value={ownerMembershipId === null ? "" : String(ownerMembershipId)}
        onChange={handleChange}
        placeholder="Any owner"
        searchPlaceholder="Search members…"
        emptyText={ownersAreLoading ? "Loading members…" : ownersError ? "Use Retry members below." : "No members found."}
        onSearchChange={onOwnerSearchChange}
        aria-label="Restrict answer to pages owned by a member"
        footer={ownersError ? (
          <div className="p-2 text-center text-sm" role="alert">
            <span>Could not load members.</span>
            <ErrorReference error={ownersError} />
            <Button type="button" variant="ghost" size="sm" onClick={onOwnersRetry}>Retry members</Button>
          </div>
        ) : ownersHasMore ? (
          <div className="p-2 text-center">
            <Button type="button" variant="ghost" size="sm" disabled={ownersAreFetchingMore} onClick={onOwnersLoadMore}>
              {ownersAreFetchingMore ? "Loading members…" : "Load more members"}
            </Button>
          </div>
        ) : null}
      />
    </div>
  );
}

function KbSourcesScopeSheet({
  open,
  onOpenChange,
  sources,
  isLoading,
  sourceError,
  sourceHasMore,
  sourceIsFetchingMore,
  onSourceLoadMore,
  onSourceRetry,
  selectedIds,
  onSelectionChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  currentUserId,
  kindFilter,
  onKindFilterChange,
  ownerFilter,
  onOwnerFilterChange,
  spaceIdFilter,
  onSpaceIdFilterChange,
  spaces,
  ownerMembershipId,
  onOwnerMembershipIdChange,
  owners,
  selectedOwner,
  onOwnerSearchChange,
  ownersAreLoading,
  ownersHasMore,
  ownersAreFetchingMore,
  onOwnersLoadMore,
  ownersError,
  onOwnersRetry,
  statusScope,
  onStatusScopeChange,
  onConfirm,
  pageSearchQuery,
  onPageSearchQueryChange,
  pageSearchResults,
  pageSearchIsLoading,
  selectedPageIds,
  onPageSelectionChange,
}: Omit<KbSourcesSheetScopeProps, "mode">) {
  const readyVisible = sources.filter((s) => s.status === "ready");
  const allSelected =
    readyVisible.length > 0 &&
    readyVisible.every((s) => selectedIds.includes(s.id));
  const totalSelected = selectedIds.length + selectedPageIds.length;
  const noneSelected = totalSelected === 0;
  const hasSourceFilter = kindFilter !== "all" || ownerFilter !== "all";
  const pageOnlyScope = verifiedOnly || ownerMembershipId !== null || statusScope !== null;
  const sourceSelectionConflicts = pageOnlyScope && selectedIds.length > 0;

  function handleClearSourceFilter() {
    onKindFilterChange("all");
    onOwnerFilterChange("all");
  }

  const description = sourceSelectionConflicts
    ? "Selected files and notes are excluded by page owner, page status or verification. Deselect them or choose pages to search."
    : noneSelected
      ? pageOnlyScope
        ? "Only eligible pages and articles will be searched. Files and notes are excluded."
        : "All ready sources and pages will be searched. Select specific items to narrow the answer."
      : `${totalSelected} item${totalSelected === 1 ? "" : "s"} selected — only these will be searched.`;

  function handleToggleAll() {
    if (allSelected) {
      onSelectionChange(
        selectedIds.filter((id) => !readyVisible.some((s) => s.id === id)),
      );
    } else {
      const toAdd = readyVisible
        .filter((s) => !selectedIds.includes(s.id))
        .map((s) => s.id);
      onSelectionChange([...selectedIds, ...toAdd]);
    }
  }

  function handleToggleSource(id: number) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choose sources"
      description={description}
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-1 rounded-md border border-border bg-muted p-1">
            {SOURCE_KINDS.map((kind) => (
              <KindFilterButton
                key={kind}
                kind={kind}
                active={kindFilter === kind}
                onSelect={onKindFilterChange}
              />
            ))}
          </div>
          {currentUserId !== undefined && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
              <UserIcon className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
              {OWNER_FILTERS.map((owner) => (
                <OwnerFilterButton
                  key={owner}
                  owner={owner}
                  active={ownerFilter === owner}
                  onSelect={onOwnerFilterChange}
                />
              ))}
            </div>
          )}
        </div>

        {spaces.length > 0 && (
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
            <Layers className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
            <SpaceFilterButton
              spaceId={null}
              label="All"
              active={spaceIdFilter === null}
              onSelect={onSpaceIdFilterChange}
            />
            {spaces.map((space) => (
              <SpaceFilterButton
                key={space.id}
                spaceId={space.id}
                label={space.name}
                active={spaceIdFilter === space.id}
                onSelect={onSpaceIdFilterChange}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            Page status
          </span>
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
            <StatusScopeButton
              status={null}
              label="Any"
              active={statusScope === null}
              onSelect={onStatusScopeChange}
            />
            {KB_ASK_STATUS_SCOPES.map((status) => (
              <StatusScopeButton
                key={status}
                status={status}
                label={statusScopeLabel(status)}
                active={statusScope === status}
                onSelect={onStatusScopeChange}
              />
            ))}
          </div>
        </div>

        <OwnerMembershipSelect
          ownerMembershipId={ownerMembershipId}
          onOwnerMembershipIdChange={onOwnerMembershipIdChange}
          owners={owners}
          selectedOwner={selectedOwner}
          onOwnerSearchChange={onOwnerSearchChange}
          ownersAreLoading={ownersAreLoading}
          ownersHasMore={ownersHasMore}
          ownersAreFetchingMore={ownersAreFetchingMore}
          onOwnersLoadMore={onOwnersLoadMore}
          ownersError={ownersError}
          onOwnersRetry={onOwnersRetry}
        />

        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="verified-only-toggle" className="text-sm">
              Verified pages and articles only
            </Label>
          </div>
          <Switch
            id="verified-only-toggle"
            checked={verifiedOnly}
            onCheckedChange={onVerifiedOnlyChange}
            aria-label="Restrict answer to verified pages and articles only"
          />
        </div>

        {readyVisible.length > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selectedIds.length === 0
                ? "No sources selected"
                : `${selectedIds.length} of ${sources.filter((s) => s.status === "ready").length} sources selected`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleToggleAll}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          </div>
        )}

        {sourceError && sources.length === 0 ? (
          <SourceReadError error={sourceError} onRetry={onSourceRetry} />
        ) : (
          <ScopeSourcesList
            isLoading={isLoading}
            sources={sources}
            selectedIds={selectedIds}
            onToggle={handleToggleSource}
            filtersActive={hasSourceFilter}
            onClearFilters={handleClearSourceFilter}
          />
        )}
        <SourcePagination
          error={sources.length > 0 ? sourceError : null}
          hasMore={sourceHasMore}
          isFetchingMore={sourceIsFetchingMore}
          onLoadMore={onSourceLoadMore}
          onRetry={onSourceRetry}
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pages</p>
          <Input
            value={pageSearchQuery}
            onChange={(e) => onPageSearchQueryChange(e.target.value)}
            placeholder="Search pages…"
            className="h-8 text-xs"
            aria-label="Search pages"
          />
          {pageSearchIsLoading ? (
            <div className="space-y-1">
              {PAGE_SEARCH_SKELETON_KEYS.map((skeletonKey) => (
                <Skeleton key={skeletonKey} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : pageSearchResults.length > 0 ? (
            <ul className="space-y-1">
              {pageSearchResults.map((page) => (
                <ScopePageRow
                  key={page.id}
                  page={page}
                  selectedPageIds={selectedPageIds}
                  onToggle={onPageSelectionChange}
                />
              ))}
            </ul>
          ) : pageSearchQuery.length > 0 ? (
            <p className="text-xs text-muted-foreground">No pages found</p>
          ) : (
            <p className="text-xs text-muted-foreground">Type to search pages</p>
          )}
        </div>

        <Button
          className="w-full gap-1.5"
          onClick={onConfirm}
          disabled={sourceSelectionConflicts && selectedPageIds.length === 0}
        >
          <Check className="h-4 w-4" />
          {sourceSelectionConflicts
            ? `Search ${selectedPageIds.length} page${selectedPageIds.length === 1 ? "" : "s"}`
            : noneSelected
              ? pageOnlyScope ? "Apply page scope" : "Search all sources and pages"
              : `Search ${totalSelected} item${totalSelected === 1 ? "" : "s"}`}
        </Button>
      </div>
    </AppSheet>
  );
}

interface SourcesListProps {
  isLoading: boolean;
  sources: KbSource[];
  makeDeleteHandler: (id: number) => () => void;
  deletingId: number | undefined;
  isDeleting: boolean;
}

function SourceReadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-2 text-sm text-destructive">
      <p>Could not load sources.</p>
      <ErrorReference error={error} />
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry sources</Button>
    </div>
  );
}

function SourcePagination({
  error,
  hasMore,
  isFetchingMore,
  onLoadMore,
  onRetry,
}: {
  error: unknown;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  if (!hasMore && !error) return null;
  return (
    <div className="space-y-2">
      {Boolean(error) && (
        <div role="alert" className="text-sm text-destructive">
          Could not load the full source list. <ErrorReference error={error} />
        </div>
      )}
      {hasMore && (
        <Button type="button" variant="outline" size="sm" disabled={isFetchingMore} onClick={onLoadMore}>
          {isFetchingMore ? "Loading sources…" : error ? "Retry loading sources" : "Load more sources"}
        </Button>
      )}
      {Boolean(error) && !hasMore && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry sources</Button>
      )}
    </div>
  );
}

function SourcesList({
  isLoading,
  sources,
  makeDeleteHandler,
  deletingId,
  isDeleting,
}: SourcesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        illustrationPreset="knowledge"
        title="No sources yet"
        description="Upload a file or add a note to ground answers on your content."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {sources.map((source) => (
        <SourceRow
          key={source.id}
          source={source}
          onDelete={makeDeleteHandler(source.id)}
          isDeleting={isDeleting && deletingId === source.id}
        />
      ))}
    </ul>
  );
}

interface ScopeSourcesListProps {
  isLoading: boolean;
  sources: KbSource[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
}

function ScopeSourcesList({
  isLoading,
  sources,
  selectedIds,
  onToggle,
  filtersActive,
  onClearFilters,
}: ScopeSourcesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        illustrationPreset="knowledge"
        title="No sources yet"
        description={filtersActive ? undefined : "Upload a file or add a note to see it here."}
        filtersActive={filtersActive}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {sources.map((source) => (
        <ScopeSourceRow
          key={source.id}
          source={source}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

function ScopeSourceRow({
  source,
  selectedIds,
  onToggle,
}: {
  source: KbSource;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const isReady = source.status === "ready";
  const isChecked = selectedIds.includes(source.id);
  function handleCheckedChange() {
    if (isReady) onToggle(source.id);
  }
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm",
        !isReady && "opacity-50",
      )}
    >
      <Checkbox
        id={`scope-source-${source.id}`}
        checked={isChecked}
        disabled={!isReady}
        onCheckedChange={handleCheckedChange}
        aria-label={`Include ${source.title ?? "source"} in search`}
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {source.kind === "file" ? (
          <BookOpenTextIcon size={16} className="text-muted-foreground" />
        ) : (
          <StickyNote className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <label
        htmlFor={`scope-source-${source.id}`}
        className="min-w-0 flex-1 cursor-pointer"
      >
        <TruncatedText
          text={source.title ?? ""}
          className="text-sm font-medium text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          {source.chunkCount > 0 ? `${source.chunkCount} chunks` : "—"}
        </p>
      </label>
      <SourceStatusBadge source={source} />
    </li>
  );
}

function ScopePageRow({
  page,
  selectedPageIds,
  onToggle,
}: {
  page: KbPageSearchResult;
  selectedPageIds: number[];
  onToggle: (ids: number[]) => void;
}) {
  const isChecked = selectedPageIds.includes(page.id);
  function handleCheckedChange() {
    if (isChecked) {
      onToggle(selectedPageIds.filter((x) => x !== page.id));
    } else {
      onToggle([...selectedPageIds, page.id]);
    }
  }
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <Checkbox
        id={`scope-page-${page.id}`}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        aria-label={`Include ${page.title} in search`}
      />
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <label htmlFor={`scope-page-${page.id}`} className="min-w-0 flex-1 cursor-pointer">
        <TruncatedText text={page.title} className="text-sm font-medium text-foreground" />
      </label>
    </li>
  );
}

function SourceRow({
  source,
  onDelete,
  isDeleting,
}: {
  source: KbSource;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {source.kind === "file" ? (
          <BookOpenTextIcon size={16} className="text-muted-foreground" />
        ) : (
          <StickyNote className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <TruncatedText
          text={source.title ?? ""}
          className="text-sm font-medium text-foreground"
        />
        <p className="text-xs text-muted-foreground">
          {source.chunkCount > 0 ? `${source.chunkCount} chunks` : "—"}
        </p>
      </div>

      <SourceStatusBadge source={source} />

      <LoadingButton
        variant="ghost"
        size="icon"
        className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        isPending={isDeleting}
        aria-label="Delete source"
      >
        {!isDeleting && <Trash2Icon size={14} />}
      </LoadingButton>
    </li>
  );
}

function SourceStatusBadge({ source }: { source: KbSource }) {
  if (source.status === "processing") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }
  if (source.status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="shrink-0 cursor-default">
            Failed
          </Badge>
        </TooltipTrigger>
        {source.errorMessage ? (
          <TooltipContent>{source.errorMessage}</TooltipContent>
        ) : null}
      </Tooltip>
    );
  }
  return (
    <Badge variant="default" className="shrink-0">
      Ready
    </Badge>
  );
}
