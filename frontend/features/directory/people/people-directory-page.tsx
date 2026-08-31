"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import {
  usePeople,
  useDeletePerson,
} from "@/hooks/api/directory/people";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonFormDialog } from "./person-form-dialog";
import type { OrganizationPerson } from "@/types/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import {
  getPersonAccessBadge,
  getPersonAccessBadgeTone,
} from "./person-account-access";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function displayName(person: OrganizationPerson): string {
  if (person.displayName) return person.displayName;
  return `${person.firstName} ${person.lastName}`.trim();
}

function AddPersonButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> Add person record
    </Button>
  );
}

function PersonRowActions({
  person,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  person: OrganizationPerson;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (p: OrganizationPerson) => void;
  onDelete: (p: OrganizationPerson) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(person), [person, onEdit]);
  const handleDelete = useCallback(() => onDelete(person), [person, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Person actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Remove from directory
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<OrganizationPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationPerson | null>(null);

  const { data, isLoading, isError, refetch } = usePeople({
    cursor: cursorHistory.at(-1),
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const deletePerson = useDeletePerson();

  const canManageRow = canUpdate || canDelete;

  function handleClearSearch() {
    setSearch("");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setCursorHistory([undefined]);
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

  const columns: DataTableColumn<OrganizationPerson>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => displayName(r),
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <Link
          href={`${basePath}/${row.organizationPersonId}`}
          className={cn(
            "font-medium text-foreground hover:text-primary transition-colors",
            TEXT_ONE_LINE,
          )}
          title={displayName(row)}
        >
          {displayName(row)}
        </Link>
      ),
    },
    {
      key: "workEmail",
      header: "Work email",
      className: "min-w-[160px]",
      cell: (row) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {row.workEmail ?? "—"}
        </span>
      ),
    },
    {
      key: "access",
      header: "App access",
      className: "min-w-[9rem]",
      cell: (row) => (
        <SemanticBadge
          tone={getPersonAccessBadgeTone(row)}
          label={getPersonAccessBadge(row)}
          size="xs"
        />
      ),
    },
    {
      key: "phone",
      header: "Phone",
      className: "min-w-[120px]",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.phone ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      className: "w-32 shrink-0",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) =>
        canManageRow ? (
          <PersonRowActions
            person={row}
            canEdit={canUpdate}
            canDelete={canDelete}
            onEdit={handleEditRow}
            onDelete={handleDeleteRow}
          />
        ) : null,
    },
  ];

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
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={6} className="min-h-0 w-full flex-1" />
          ) : isError ? (
            <ErrorState className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)} onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)}
              illustrationPreset="team"
              title="No person records yet"
              description={isFiltered ? "No results match your filters." : "Create a person record before linking someone as a worker or payee."}
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
              {cursorHistory.length > 1 || pageInfo?.hasMore ? (
                <CursorPageControls
                  page={cursorHistory.length}
                  hasNext={pageInfo?.hasMore ?? false}
                  onPrevious={() =>
                    setCursorHistory((current) => current.slice(0, -1))
                  }
                  onNext={() => {
                    if (pageInfo?.nextCursor) {
                      setCursorHistory((current) => [
                        ...current,
                        pageInfo.nextCursor ?? undefined,
                      ]);
                    }
                  }}
                  className="mt-2"
                />
              ) : null}
            </>
          )}
        </div>
      </div>

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
            {deleteTarget ? displayName(deleteTarget) : "This person"} will
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
