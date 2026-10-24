"use client";

import React, { useState } from "react";
import {
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
} from "@animateicons/react/lucide";
import {
  Check,
  ShieldCheck,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorReference } from "@/components/shared/error-reference";
import { cn } from "@/lib/utils";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import type { KbPageSearchResult } from "@/hooks/api/kb/page-types";
import { KB_ASK_STATUS_SCOPES, type KbAskStatusScope } from "@/hooks/api/kb/ask";

interface KbSourcesSheetManageProps {
  mode: "manage";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: KbPageCollectionItem[];
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
  sources: KbPageCollectionItem[];
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
      ? `${readyCount} of ${sources.length} files indexed for AI answers`
      : "Upload files or add notes to ground answers on your content.";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sources"
      description={description}
      className="sm:max-w-md"
      scrollArea
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
            <UploadIcon size={16} />
            {uploadPending ? "Uploading…" : "Upload"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onAddNoteClick}
          >
            <PlusIcon size={16} />
            Note
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          PDF, DOCX, XLSX, TXT, MD, or CSV — up to 25 MB.
        </p>

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

const PAGE_SEARCH_SKELETON_KEYS = ["page-search-skeleton-a", "page-search-skeleton-b"] as const;

const OWNER_FILTERS = ["all", "mine"] as const;
export type OwnerFilter = (typeof OWNER_FILTERS)[number];

const OWNER_LABELS: Record<OwnerFilter, string> = { all: "All", mine: "Mine" };

function isOwnerFilter(value: string): value is OwnerFilter {
  return (OWNER_FILTERS as readonly string[]).includes(value);
}

function statusScopeLabel(status: KbAskStatusScope): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isStatusScope(value: string): value is KbAskStatusScope {
  return (KB_ASK_STATUS_SCOPES as readonly string[]).includes(value);
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Owner</Label>
        {ownerMembershipId !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
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
        aria-label="Restrict answer to files owned by a member"
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
  const readyVisible = sources.filter((s) => s.status !== "archived");
  const allSelected =
    readyVisible.length > 0 &&
    readyVisible.every((s) => selectedIds.includes(s.id));
  const totalSelected = selectedIds.length + selectedPageIds.length;
  const noneSelected = totalSelected === 0;
  const hasSourceFilter = ownerFilter !== "all";
  const pageOnlyScope = verifiedOnly || ownerMembershipId !== null || statusScope !== null;
  const sourceSelectionConflicts = pageOnlyScope && selectedIds.length > 0;

  function handleClearSourceFilter() {
    onOwnerFilterChange("all");
  }

  const description = sourceSelectionConflicts
    ? "Those files are excluded. Clear the filter or pick pages."
    : noneSelected
      ? pageOnlyScope
        ? "Pages only. Files and notes are out."
        : "Search everything, or narrow it."
      : `${totalSelected} selected.`;

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
      scrollArea
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {currentUserId !== undefined && (
            <Tabs
              value={ownerFilter}
              onValueChange={(value) => {
                if (isOwnerFilter(value)) onOwnerFilterChange(value);
              }}
              className="w-auto shrink-0 gap-0"
            >
              <TabsList aria-label="Whose sources">
                {OWNER_FILTERS.map((owner) => (
                  <TabsTrigger key={owner} value={owner}>
                    {OWNER_LABELS[owner]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          {spaces.length > 0 ? (
            <Select
              value={spaceIdFilter === null ? "all" : String(spaceIdFilter)}
              onValueChange={(value) =>
                onSpaceIdFilterChange(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger aria-label="Space" className="min-w-0 flex-1 basis-40">
                <SelectValue placeholder="All spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All spaces</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Tabs
            value={statusScope ?? "any"}
            onValueChange={(value) => {
              onStatusScopeChange(value === "any" || !isStatusScope(value) ? null : value);
            }}
            className="gap-0"
          >
            <TabsList aria-label="Page status" className="w-full md:w-full">
              <TabsTrigger value="any">Any</TabsTrigger>
              {KB_ASK_STATUS_SCOPES.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {statusScopeLabel(status)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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

        <div className="flex h-9 items-center justify-between rounded-md border border-input bg-card px-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <Label htmlFor="verified-only-toggle">Verified only</Label>
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
            <span className="text-sm text-muted-foreground">
              {selectedIds.length === 0
                ? "No sources selected"
                : `${selectedIds.length} of ${sources.filter((s) => s.status !== "archived").length} sources selected`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2"
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="kb-scope-file-search">Files</Label>
          <Input
            id="kb-scope-file-search"
            value={pageSearchQuery}
            onChange={(e) => onPageSearchQueryChange(e.target.value)}
            placeholder="Search files…"
            aria-label="Search files"
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
            <p className="text-sm text-muted-foreground">No files found</p>
          ) : (
            <p className="text-sm text-muted-foreground">Type to search files</p>
          )}
        </div>

        <Button
          className="w-full gap-1.5"
          onClick={onConfirm}
          disabled={sourceSelectionConflicts && selectedPageIds.length === 0}
        >
          <Check className="h-4 w-4" />
          {sourceSelectionConflicts
            ? `Search ${selectedPageIds.length} file${selectedPageIds.length === 1 ? "" : "s"}`
            : noneSelected
              ? pageOnlyScope ? "Apply file scope" : "Search all sources and files"
              : `Search ${totalSelected} item${totalSelected === 1 ? "" : "s"}`}
        </Button>
      </div>
    </AppSheet>
  );
}

interface SourcesListProps {
  isLoading: boolean;
  sources: KbPageCollectionItem[];
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
  sources: KbPageCollectionItem[];
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
  source: KbPageCollectionItem;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const isReady = source.status !== "archived";
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
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <BookOpenTextIcon size={16} className="text-muted-foreground" />
      </div>
      <label
        htmlFor={`scope-source-${source.id}`}
        className="min-w-0 flex-1 cursor-pointer"
      >
        <TruncatedText
          text={source.title ?? ""}
          className="text-sm font-medium text-foreground"
        />
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
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4 text-muted-foreground" />
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
  source: KbPageCollectionItem;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <BookOpenTextIcon size={16} className="text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <TruncatedText
          text={source.title ?? ""}
          className="text-sm font-medium text-foreground"
        />
      </div>

      <SourceStatusBadge source={source} />

      <LoadingButton
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        isPending={isDeleting}
        aria-label="Delete source"
      >
        {!isDeleting && <Trash2Icon size={16} />}
      </LoadingButton>
    </li>
  );
}

function SourceStatusBadge({ source }: { source: KbPageCollectionItem }) {
  if (source.status === "published") {
    return (
      <Badge variant="default" className="shrink-0">
        Published
      </Badge>
    );
  }
  if (source.status === "archived") {
    return (
      <Badge variant="secondary" className="shrink-0">
        Archived
      </Badge>
    );
  }
  if (source.status === "in_review") {
    return (
      <Badge variant="secondary" className="shrink-0">
        In review
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="shrink-0">
      Draft
    </Badge>
  );
}
