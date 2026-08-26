"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/api/access";
import { useSubjectTypes, useSubjects } from "@/hooks/api/party/subjects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { RecordList, type RecordValue } from "@/features/renderer";
import { subjectLayout, subjectRecord } from "@/lib/renderer/subject-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SubjectDetailSheet } from "./subject-detail-sheet";
import { SubjectFormDialog } from "./subject-form-dialog";
import { cn } from "@/lib/utils";
import type { RenderableSubject } from "@/lib/renderer/subject-layout";

function AddSubjectButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> {label}
    </Button>
  );
}

const PAGE_SIZE = 20;

/**
 * The things this organisation transacts.
 *
 * There is no property screen and no candidate screen. A tenant declares a
 * type, and this page renders it — columns, labels, empty state and mobile card
 * all derived from their declaration through the same engine that renders
 * parties. Which is the claim ticket 07 was written to test.
 */
export function SubjectsPage() {
  const canManage = useCan("party:subjects:manage");

  const [typeId, setTypeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  // The open record lives in the URL so a task assigned on a subject's timeline
  // lands on the subject itself, not merely on the list.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openSubjectId = searchParams.get("subjectId");

  const setOpenSubjectId = useCallback(
    (subjectId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (subjectId) params.set("subjectId", subjectId);
      else params.delete("subjectId");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RenderableSubject | null>(null);

  const types = useSubjectTypes();
  const typeList = types.data?.data ?? [];
  const selectedType = typeList.find((t) => t.subjectTypeId === typeId) ?? typeList[0];

  const subjects = useSubjects({
    subjectTypeId: selectedType?.subjectTypeId,
    search: debouncedSearch || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  function handleTypeChange(value: string) {
    setTypeId(value);
    setCursor(undefined);
    setSearch("");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCursor(undefined);
  }

  function handleRetry() {
    void subjects.refetch();
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) setOpenSubjectId(null);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleEditDialogChange(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function handleEditRequest(subject: RenderableSubject) {
    setOpenSubjectId(null);
    setEditTarget(subject);
  }

  function handleNextPage() {
    const next = subjects.data?.pagination.nextCursor;
    if (next) setCursor(next);
  }

  if (types.isLoading)
    return (
      <PageWrapper title="Subjects">
        <DataTableSkeleton rows={12} columns={5} className="flex-1" />
      </PageWrapper>
    );

  if (types.isError)
    return (
      <PageWrapper title="Subjects">
        <ErrorState
          className={CONTENT_FILL_PANEL}
          title="Couldn't load subject types"
          onRetry={() => void types.refetch()}
        />
      </PageWrapper>
    );

  if (!selectedType)
    return (
      <PageWrapper title="Subjects" subtitle="What this organisation transacts">
        <EmptyState
          className={CONTENT_FILL_PANEL}
          title="No subject types declared"
          description="Declare what your business transacts — a property, a candidate, a shipment, a policy — and it becomes a record type here, with no engineer and no migration."
        />
      </PageWrapper>
    );

  const layout = subjectLayout(selectedType);
  const rows = subjects.data?.data ?? [];
  const hasMore = subjects.data?.pagination.hasMore ?? false;
  const isFiltered = !!debouncedSearch.trim();

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder={layout.list.searchPlaceholder}
        value={search}
        onValueChange={handleSearchChange}
      />
      {typeList.length > 1 ? (
        <Select value={selectedType.subjectTypeId} onValueChange={handleTypeChange}>
          <SelectTrigger
            className={cn("w-fit min-w-[10rem]", FILTER_SELECT_TRIGGER)}
            aria-label="Subject type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {typeList.map((type) => (
              <SelectItem key={type.subjectTypeId} value={type.subjectTypeId}>
                {type.plural}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title={selectedType.plural}
      subtitle={`${selectedType.plural} this organisation transacts`}
      filters={filtersBar}
      actions={
        canManage ? (
          <AddSubjectButton label={`New ${selectedType.singular}`} onClick={handleOpenCreate} />
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        {subjects.isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : subjects.isError ? (
          <ErrorState
            className={CONTENT_FILL_PANEL}
            title={`Couldn't load ${selectedType.plural.toLowerCase()}`}
            onRetry={handleRetry}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            title={
              isFiltered
                ? `No matching ${selectedType.plural.toLowerCase()}`
                : `No ${selectedType.plural.toLowerCase()} yet`
            }
            description={
              isFiltered
                ? "Try adjusting your search."
                : `Records of this type will appear here once ${canManage ? "you add" : "someone adds"} them.`
            }
            action={
              isFiltered || !canManage
                ? undefined
                : { label: `New ${selectedType.singular}`, onClick: handleOpenCreate }
            }
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={rows.map((row) => subjectRecord(row) as RecordValue)}
              getRowKey={(row) => String(row.subjectId)}
              onRowClick={(row) => setOpenSubjectId(String(row.subjectId))}
              minWidth="720px"
              className={CONTENT_FILL_PANEL}
            />
            {hasMore ? (
              <div className="flex shrink-0 justify-end px-1">
                <Button variant="outline" size="sm" onClick={handleNextPage}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <SubjectDetailSheet
        subjectId={openSubjectId}
        type={selectedType}
        onOpenChange={handleSheetOpenChange}
        onEdit={canManage ? handleEditRequest : undefined}
        canManage={canManage}
      />

      {createOpen ? (
        <SubjectFormDialog open={createOpen} onOpenChange={setCreateOpen} type={selectedType} />
      ) : null}

      {editTarget ? (
        <SubjectFormDialog
          open={!!editTarget}
          onOpenChange={handleEditDialogChange}
          type={selectedType}
          subject={editTarget}
        />
      ) : null}
    </PageWrapper>
  );
}
