"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonFormDialog } from "./person-form-dialog";
import type { OrganizationPerson } from "@/types/directory/people";
import { getErrorMessage } from "@/lib/get-error-message";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

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
      <PlusIcon ref={iconRef} size={14} /> Add Person
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
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PeopleDirectoryPage() {
  const canCreate = useCan("directory:people:create");
  const canUpdate = useCan("directory:people:update");
  const canDelete = useCan("directory:people:delete");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<OrganizationPerson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationPerson | null>(null);

  const { data, isLoading, isError, refetch } = usePeople({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const deletePerson = useDeletePerson();

  const canManageRow = canUpdate || canDelete;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    setDebouncedSearch(value);
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
        toast.success("Person deleted");
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
          href={`/directory/${row.organizationPersonId}`}
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
  const pagination = data?.pagination;
  const isFiltered = !!debouncedSearch.trim();

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search people…"
        value={search}
        onValueChange={handleSearchChange}
      />
    </div>
  );

  return (
    <PageWrapper
      title="People"
      subtitle="Everyone in your organization"
      filters={filtersBar}
      actions={canCreate ? <AddPersonButton onClick={handleOpenCreate} /> : undefined}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={5} className="flex-1" />
          ) : isError ? (
            <ErrorState className={CONTENT_FILL_PANEL} onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="team"
              title={isFiltered ? "No matching people" : "No people yet"}
              description={
                isFiltered
                  ? "Try adjusting your search."
                  : "Add people to build your organization directory."
              }
              action={
                isFiltered
                  ? undefined
                  : canCreate
                    ? { label: "Add Person", onClick: handleOpenCreate }
                    : undefined
              }
            />
          ) : (
            <>
              <DataTable
                data={rows}
                columns={columns}
                getRowKey={(row) => row.organizationPersonId}
                minWidth="640px"
                className={CONTENT_FILL_PANEL}
              />
              {pagination && pagination.totalPages > 1 ? (
                <TablePagination
                  page={pagination.page}
                  pageSize={pagination.limit}
                  total={pagination.total}
                  onPageChange={setPage}
                  className="mt-2 px-1"
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

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this person?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {deleteTarget ? displayName(deleteTarget) : "this person"} from the
              directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
