"use client";

import { useCallback, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import {
  usePeople,
  useDeletePerson,
} from "@/hooks/api/directory/people";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PersonFormDialog } from "./person-form-dialog";
import type { OrganizationPerson } from "@/types/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  buildPersonColumns,
  personDisplayName,
} from "./person-table-columns";
import { PersonPeekDrawer } from "./person-peek-drawer";

const PAGE_SIZE = 20;

function AddPersonButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> Add person record
    </Button>
  );
}

interface PeopleDirectoryPageProps {
  basePath?: string;
}

export function PeopleDirectoryPage({
  basePath = "/directory",
}: PeopleDirectoryPageProps) {
  const canCreate = useCan("directory:people:create");
  const canUpdate = useCan("directory:people:update");
  const canDelete = useCan("directory:people:delete");

  const pagination = useCursorPageStack();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<OrganizationPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationPerson | null>(null);
  const [peekTarget, setPeekTarget] = useState<OrganizationPerson | null>(null);
  const peekOpenerRef = useRef<HTMLElement | null>(null);

  const peopleQuery = usePeople({
    cursor: pagination.cursor,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const { data, isLoading, isError, refetch } = peopleQuery;

  const deletePerson = useDeletePerson();

    function handleClearSearch() {
    setSearch("");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    pagination.resetToFirstPage();
  }

  function handleNextPage() {
    if (pageInfo?.nextCursor) pagination.goToNextPage(pageInfo.nextCursor);
  }

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  function handleCreateDialogChange(open: boolean) {
    if (!open) setCreateOpen(false);
  }

  function handleEditDialogChange(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  const handlePeek = useCallback((row: OrganizationPerson) => {
    peekOpenerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPeekTarget(row);
  }, []);

  const handlePeekOpenChange = useCallback((open: boolean) => {
    if (open) return;
    setPeekTarget(null);
    const opener = peekOpenerRef.current;
    peekOpenerRef.current = null;
    if (opener) requestAnimationFrame(() => opener.focus());
  }, []);

  function handleEditRow(row: OrganizationPerson) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: OrganizationPerson) {
    setDeleteTarget(row);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deletePerson.mutate(deleteTarget.organizationPersonId, {
      onSuccess: () => {
        toast.success("Person removed from the directory");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const columns = buildPersonColumns({
    basePath,
    canUpdate,
    canDelete,
    onPeek: handlePeek,
    onEdit: handleEditRow,
    onDelete: handleDeleteRow,
  });

  const rows = data?.data ?? [];
  const pageInfo = data?.pageInfo;
  const isFiltered = !!debouncedSearch.trim();

  const filtersBar = (
    <SearchInput
      placeholder="Search people…"
      value={search}
      onValueChange={handleSearchChange}
    />
  );

  return (
    <PageWrapper
      title="Directory"
      subtitle="People in your organization—with or without application access."
      filters={filtersBar}
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={canCreate ? <AddPersonButton onClick={handleOpenCreate} /> : undefined}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {peopleQuery.access.denied ? (
            <NoPermissionState
              permission={peopleQuery.access.permission}
              className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)}
              title="Directory unavailable"
              description="Your access to the people directory was withdrawn. Nothing is missing from the directory itself."
            />
          ) : isLoading || peopleQuery.access.pending ? (
            <DataTableSkeleton rows={12} columns={6} className="min-h-0 w-full flex-1" />
          ) : isError || peopleQuery.access.unavailable ? (
            <ErrorState className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)} onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)}
              illustrationPreset="team"
              title="No person records yet"
              description={isFiltered ? "No results match your filters." : "The organization directory is empty. Add people here before linking them as workers, contacts, or payees."}
              filtersActive={isFiltered}
              onClearFilters={handleClearSearch}
              action={!isFiltered && canCreate ? { label: "Add person record", onClick: handleOpenCreate } : undefined}
            />
          ) : (
            <>
              <DataTable
                data={rows}
                columns={columns}
                getRowKey={(row) => row.organizationPersonId}
                minWidth="760px"
                className={CONTENT_FILL_PANEL}
              />
              {pagination.hasPrevious || pageInfo?.hasMore ? (
                <CursorPageControls
                  page={pagination.page}
                  hasNext={pageInfo?.hasMore ?? false}
                  onPrevious={pagination.goToPreviousPage}
                  onNext={handleNextPage}
                  className="mt-2"
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      <PersonPeekDrawer
        person={peekTarget}
        basePath={basePath}
        open={peekTarget !== null}
        onOpenChange={handlePeekOpenChange}
      />

      {createOpen && (
        <PersonFormDialog
          open={createOpen}
          onOpenChange={handleCreateDialogChange}
          mode="create"
        />
      )}

      {editTarget && (
        <PersonFormDialog
          open={!!editTarget}
          onOpenChange={handleEditDialogChange}
          mode="edit"
          defaultValues={editTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Remove this person from the directory?"
        description={
          <>
            {deleteTarget ? personDisplayName(deleteTarget) : "This person"} will
            leave the active directory. Their application account, worker
            record, and history remain intact.
          </>
        }
        confirmLabel="Remove from directory"
        destructive
        keepOpenOnConfirm
        isPending={deletePerson.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
