"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useParties, useDeleteParty } from "@/hooks/api/party/parties";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { PartyFormDialog } from "./party-form-dialog";
import type { BusinessParty, PartyType } from "@/types/party/parties";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  PARTNER: "Partner",
  BOTH: "Customer & Vendor",
};

const PARTY_TYPE_TONES: Record<PartyType, BadgeTone> = {
  CUSTOMER: "info",
  VENDOR: "teal",
  PARTNER: "accent",
  BOTH: "warning",
};

type PartyTypeFilter = PartyType | "ALL";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function AddPartyButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="gap-1.5 text-xs" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> Add Party
    </Button>
  );
}

function PartyRowActions({
  party,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  party: BusinessParty;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (p: BusinessParty) => void;
  onDelete: (p: BusinessParty) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(party), [party, onEdit]);
  const handleDelete = useCallback(() => onDelete(party), [party, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Party actions"
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

export function PartiesPage() {
  const canCreate = useCan("party:parties:create");
  const canUpdate = useCan("party:parties:update");
  const canDelete = useCan("party:parties:delete");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<PartyTypeFilter>("ALL");

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<BusinessParty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessParty | null>(null);

  const { data, isLoading, isError, refetch } = useParties({
    page,
    limit: PAGE_SIZE,
    partyType: partyTypeFilter === "ALL" ? undefined : partyTypeFilter,
    search: debouncedSearch || undefined,
  });

  const deleteParty = useDeleteParty();

  const canManageRow = canUpdate || canDelete;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    setDebouncedSearch(value);
  }

  function handlePartyTypeChange(value: string) {
    setPartyTypeFilter(value as PartyTypeFilter);
    setPage(1);
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

  function handleEditRow(row: BusinessParty) {
    setEditTarget(row);
  }

  function handleDeleteRow(row: BusinessParty) {
    setDeleteTarget(row);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteParty.mutate(deleteTarget.partyId, {
      onSuccess: () => {
        toast.success("Party deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const columns: DataTableColumn<BusinessParty>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="min-w-0 flex flex-col gap-0.5">
          <span
            className={cn("font-medium text-foreground", TEXT_ONE_LINE)}
            title={row.name}
          >
            {row.name}
          </span>
          {row.legalName ? (
            <span
              className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}
              title={row.legalName}
            >
              {row.legalName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "partyType",
      header: "Type",
      className: "w-36 shrink-0",
      cell: (row) => (
        <SemanticBadge
          tone={PARTY_TYPE_TONES[row.partyType]}
          label={PARTY_TYPE_LABELS[row.partyType]}
          size="xs"
        />
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "min-w-[160px]",
      cell: (row) => (
        <span className={cn("text-sm text-muted-foreground", TEXT_ONE_LINE)}>
          {row.email ?? "—"}
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
          <PartyRowActions
            party={row}
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
  const isFiltered = !!debouncedSearch.trim() || partyTypeFilter !== "ALL";

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search parties…"
        value={search}
        onValueChange={handleSearchChange}
      />
      <Select value={partyTypeFilter} onValueChange={handlePartyTypeChange}>
        <SelectTrigger
          className={cn("h-9 w-fit min-w-[9rem]", FILTER_SELECT_TRIGGER)}
          data-slot="select-trigger"
        >
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="ALL">All types</SelectItem>
          <SelectItem value="CUSTOMER">Customer</SelectItem>
          <SelectItem value="VENDOR">Vendor</SelectItem>
          <SelectItem value="PARTNER">Partner</SelectItem>
          <SelectItem value="BOTH">Customer &amp; Vendor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Business Parties"
      subtitle="Customers, vendors and partners"
      filters={filtersBar}
      actions={canCreate ? <AddPartyButton onClick={handleOpenCreate} /> : undefined}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={6} className="flex-1" />
          ) : isError ? (
            <ErrorState className={CONTENT_FILL_PANEL} onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="companies"
              title={isFiltered ? "No matching parties" : "No parties yet"}
              description={
                isFiltered
                  ? "Try adjusting your search or filter."
                  : "Add customers, vendors and partners to keep your business relationships in one place."
              }
              action={
                isFiltered
                  ? undefined
                  : canCreate
                    ? { label: "Add Party", onClick: handleOpenCreate }
                    : undefined
              }
            />
          ) : (
            <>
              <DataTable
                data={rows}
                columns={columns}
                getRowKey={(row) => row.partyId}
                minWidth="720px"
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
        <PartyFormDialog
          open={createOpen}
          onOpenChange={handleCreateDialogChange}
          mode="create"
        />
      )}

      {editTarget && (
        <PartyFormDialog
          open={!!editTarget}
          onOpenChange={handleEditDialogChange}
          mode="edit"
          defaultValues={editTarget}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this party?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {deleteTarget ? deleteTarget.name : "this party"} from your
              business directory. This action cannot be undone.
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
