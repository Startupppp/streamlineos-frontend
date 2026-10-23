"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { TablePagination } from "@/components/ui/table-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useKbSpaces,
  useArchiveKbSpace,
  useRestoreKbSpace,
} from "@/hooks/api/kb/spaces";
import type { KbSpaceListItem } from "@/hooks/api/kb/kb-spaces-settings-schema";
import { LayoutGrid, LayoutList } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  KbLayoutGridIcon,
  KbPlusIcon,
} from "@/features/wiki/lib/kb-icons";
import { SpaceCard, SpaceCardSkeleton } from "./space-card";
import { WikiFillTable } from "./wiki-collection-skeletons";
import { SpacesListTable } from "./spaces-list-table";
import { SpaceArchiveImpact } from "./space-archive-impact";
import { SpaceDeleteDialog } from "./space-delete-dialog";
import { SpaceSheet } from "./space-sheet";
import { SpaceMembersSheet } from "./space-members-sheet";

const AUDIENCE_FILTER_VALUES = ["all", "internal", "public", "mixed"] as const;
type AudienceFilter = (typeof AUDIENCE_FILTER_VALUES)[number];

const ARCHIVED_FILTER_VALUES = ["all", "active", "archived"] as const;
type ArchivedFilter = (typeof ARCHIVED_FILTER_VALUES)[number];

const VIEW_VALUES = ["card", "list"] as const;
const SPACE_VIEW_OPTIONS = [
  { value: "card", icon: LayoutGrid, label: "Card view" },
  { value: "list", icon: LayoutList, label: "List view" },
] as const;

const LIST_LIMIT = 30;

function SpacesGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

export default function SpacesPage() {
  const canManage = useCan("kb:spaces:manage");
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });

  const rawSearch = searchParams.get("q") ?? "";
  const audienceFilter: AudienceFilter = parseEnum(
    searchParams.get("audience"),
    AUDIENCE_FILTER_VALUES,
    "all",
  );
  const archivedFilter: ArchivedFilter = parseEnum(
    searchParams.get("status"),
    ARCHIVED_FILTER_VALUES,
    "active",
  );
  const view = parseEnum(searchParams.get("view"), VIEW_VALUES, "card");
  const debouncedSearch = useDebouncedValue(rawSearch, 300);
  const cursor = searchParams.get("cursor") || undefined;
  const trailValue = searchParams.get("cursorTrail");
  const cursorTrail = useMemo<(string | null)[]>(() => {
    if (!cursor) return [];
    if (!trailValue) return [null];
    try {
      const parsed: unknown = JSON.parse(trailValue);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.length <= 100 &&
        parsed[0] === null &&
        parsed.every((entry: unknown) => entry === null || typeof entry === "string")
      ) {
        return parsed;
      }
    } catch {
      return [null];
    }
    return [null];
  }, [cursor, trailValue]);

  const queryParams = {
    q: debouncedSearch || undefined,
    audience:
      audienceFilter === "all" ? undefined : audienceFilter,
    archived:
      archivedFilter === "all"
        ? undefined
        : archivedFilter === "archived"
          ? true
          : false,
    cursor,
    limit: LIST_LIMIT,
  };

  const { data, isLoading, isError, error, refetch } = useKbSpaces(queryParams);

  const spaces = data?.data ?? [];
  const pagination = data?.pagination;

  const pageState = usePageState({
    permission: "kb:spaces:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && spaces.length === 0,
  });

  function handleRetry() {
    void refetch();
  }

  const archiveSpace = useArchiveKbSpace();
  const restoreSpace = useRestoreKbSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<KbSpaceListItem | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] =
    useState<KbSpaceListItem | null>(null);
  const [restoreTarget, setRestoreTarget] =
    useState<KbSpaceListItem | null>(null);
  const [membersTarget, setMembersTarget] =
    useState<KbSpaceListItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<KbSpaceListItem | null>(null);

  const handleCreate = useCallback(() => {
    setEditingSpace(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((space: KbSpaceListItem) => {
    setEditingSpace(space);
    setSheetOpen(true);
  }, []);

  const handleArchive = useCallback((space: KbSpaceListItem) => {
    setArchiveTarget(space);
  }, []);

  const handleRestore = useCallback((space: KbSpaceListItem) => {
    setRestoreTarget(space);
  }, []);

  const handleArchiveToggle = useCallback(
    (space: KbSpaceListItem) => {
      if (space.archivedAt) handleRestore(space);
      else handleArchive(space);
    },
    [handleArchive, handleRestore],
  );

  const handleDelete = useCallback((space: KbSpaceListItem) => {
    setDeleteTarget(space);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleViewMembers = useCallback((space: KbSpaceListItem) => {
    setMembersTarget(space);
  }, []);

  const handleMembersOpenChange = useCallback((open: boolean) => {
    if (!open) setMembersTarget(null);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditingSpace(null);
  }, []);

  const handleSheetSuccess = useCallback(() => {
    setSheetOpen(false);
    setEditingSpace(null);
  }, []);

  function handleConfirmArchive() {
    if (!archiveTarget) return;
    archiveSpace.mutate(archiveTarget.id, {
      onSuccess: () => {
        toast.success(`"${archiveTarget.name}" archived`);
        setArchiveTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleConfirmRestore() {
    if (!restoreTarget) return;
    restoreSpace.mutate(restoreTarget.id, {
      onSuccess: () => {
        toast.success(`"${restoreTarget.name}" restored`);
        setRestoreTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleAudienceChange(value: string) {
    updateFilters({ audience: value === "all" ? null : value, cursorTrail: null });
  }

  function handleStatusChange(value: string) {
    updateFilters({ status: value === "active" ? null : value, cursorTrail: null });
  }

  function handleSearchChange(value: string) {
    updateFilters({ q: value || null, cursorTrail: null });
  }

  function handleClearFilters() {
    updateFilters({ q: null, audience: null, status: null, cursorTrail: null });
  }

  function handleGoNext() {
    if (!pagination?.nextCursor) return;
    updateFilters({
      cursor: pagination.nextCursor,
      cursorTrail: JSON.stringify([...cursorTrail, cursor ?? null]),
    });
  }

  function handleGoPrevious() {
    if (!cursor) return;
    const previousCursor = cursorTrail[cursorTrail.length - 1];
    updateFilters({
      cursor: previousCursor ?? null,
      cursorTrail:
        cursorTrail.length > 1
          ? JSON.stringify(cursorTrail.slice(0, -1))
          : null,
    });
  }

  function handleViewChange(next: (typeof VIEW_VALUES)[number]) {
    updateFilters({ view: next === "card" ? null : "list", cursor: cursor ?? null });
  }

  const hasActiveFilters =
    rawSearch !== "" || audienceFilter !== "all" || archivedFilter !== "active";

  const emptyNode = hasActiveFilters ? (
    <EmptyState
      illustration={<KbLayoutGridIcon className="w-8 text-muted-foreground" />}
      title="No team folders match your filters"
      description="Try adjusting your search or filters."
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className={CONTENT_FILL_PANEL}
    />
  ) : (
    <EmptyState
      illustration={<KbLayoutGridIcon className="w-8 text-muted-foreground" />}
      title="No team folders yet"
      description="Create a team folder to organize your docs."
      action={
        canManage
          ? { label: "Create team folder", onClick: handleCreate }
          : undefined
      }
      className={CONTENT_FILL_PANEL}
    />
  );

  return (
    <PageWrapper
      title="Team folders"
      subtitle="Organize your docs into team folders"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleCreate}>
            <KbPlusIcon className="h-4 w-4 mr-1.5" />
            New team folder
          </Button>
        ) : undefined
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SearchInput
            value={rawSearch}
            onValueChange={handleSearchChange}
            placeholder="Search team folders…"
            className="h-9 w-48"
          />
          <Select value={audienceFilter} onValueChange={handleAudienceChange}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={archivedFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <ViewToggle
            value={view}
            options={[...SPACE_VIEW_OPTIONS]}
            onChange={handleViewChange}
            className="ml-auto"
          />
        </div>

        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          className={CONTENT_FILL_PANEL}
          loading={
            view === "list" ? (
              <WikiFillTable
                headers={["Team folder", "Audience", "Files", "Members", "Owner", "Updated", ""]}
              />
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(11rem,1fr)]">
                {Array.from({ length: 9 }, (_, index) => (
                  <SpaceCardSkeleton key={index} />
                ))}
              </div>
            )
          }
          empty={emptyNode}
        >
          {view === "list" ? (
            <SpacesListTable
              spaces={spaces}
              canManage={canManage}
              pageSize={LIST_LIMIT}
              hasMore={pagination?.hasMore ?? false}
              hasPrevious={Boolean(cursor)}
              onNext={handleGoNext}
              onPrevious={handleGoPrevious}
              onEdit={handleEdit}
              onArchiveToggle={handleArchiveToggle}
              onDelete={handleDelete}
              onViewMembers={handleViewMembers}
              emptyState={emptyNode}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <SpacesGrid>
                {spaces.map((space: KbSpaceListItem) => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    canManage={canManage}
                    pageCount={space.pageCount}
                    onEdit={handleEdit}
                    onArchiveToggle={handleArchiveToggle}
                    onDelete={handleDelete}
                    onViewMembers={handleViewMembers}
                  />
                ))}
              </SpacesGrid>
              {pagination &&
                (pagination.hasMore || Boolean(cursor)) && (
                  <TablePagination
                    mode="cursor"
                    rowCount={spaces.length}
                    hasPrevious={Boolean(cursor)}
                    hasMore={pagination.hasMore}
                    onNext={handleGoNext}
                    onPrevious={handleGoPrevious}
                  />
                )}
            </div>
          )}
        </PageState>
      </div>

      <SpaceSheet
        key={editingSpace?.id ?? "new"}
        open={sheetOpen}
        editingSpace={editingSpace}
        onOpenChange={handleSheetOpenChange}
        onSuccess={handleSheetSuccess}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="Archive team folder?"
        description={
          archiveTarget ? (
            <>
              {`Archiving "${archiveTarget.name}" will hide it from users. Files and content are preserved and can be restored.`}
              <SpaceArchiveImpact spaceId={archiveTarget.id} />
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Archive"
        destructive
        isPending={archiveSpace.isPending}
        onConfirm={handleConfirmArchive}
      />

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title="Restore team folder?"
        description={
          restoreTarget
            ? `Restore "${restoreTarget.name}" to make it accessible again?`
            : ""
        }
        confirmLabel="Restore"
        isPending={restoreSpace.isPending}
        onConfirm={handleConfirmRestore}
      />

      <SpaceDeleteDialog space={deleteTarget} onOpenChange={handleDeleteOpenChange} />

      <SpaceMembersSheet
        spaceId={membersTarget?.id ?? 0}
        spaceName={membersTarget?.name ?? ""}
        canManageFolder={canManage}
        open={membersTarget !== null}
        onOpenChange={handleMembersOpenChange}
      />
    </PageWrapper>
  );
}
