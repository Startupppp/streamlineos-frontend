"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useParties, useDeleteParty } from "@/hooks/api/party/parties";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import type { ReactNode } from "react";
import type { RecordValue } from "@/features/renderer/format-value";
import { RecordList } from "@/features/renderer/record-list";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PartyDetailSheet, PartyFormDialog } from "./parties-lazy";

const PartyDeleteDialog = dynamic(
  () =>
    import("./party-delete-dialog").then((m) => ({
      default: m.PartyDeleteDialog,
    })),
  { ssr: false },
);
import type { BusinessParty, PartyType } from "@/types/party/parties";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type PartyTypeFilter = PartyType | "ALL";

function AddPartyButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
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
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<BusinessParty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessParty | null>(null);

  // The open record lives in the URL so a link from a subject's linked-parties
  // panel lands on the party itself, not merely on the list.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openPartyId = searchParams.get("partyId");

  const setOpenPartyId = useCallback(
    (partyId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (partyId) params.set("partyId", partyId);
      else params.delete("partyId");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleRowClick = useCallback(
    (row: RecordValue) => setOpenPartyId(String(row.partyId)),
    [setOpenPartyId],
  );

  const handleDetailOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setOpenPartyId(null);
    },
    [setOpenPartyId],
  );

  const { data, isLoading, isError, refetch } = useParties({
    page,
    limit: PAGE_SIZE,
    partyType: partyTypeFilter === "ALL" ? undefined : partyTypeFilter,
    role: roleFilter === "ALL" ? undefined : roleFilter,
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

  // Columns, labels, alignment, the legal-name subtitle and the mobile card all
  // come from PARTY_LAYOUT now. Row actions stay here because what a row can do
  // depends on this caller's permissions, which is not a property of the shape.
  const renderRowActions = (row: RecordValue): ReactNode =>
    canManageRow ? (
      <PartyRowActions
        party={row as unknown as BusinessParty}
        canEdit={canUpdate}
        canDelete={canDelete}
        onEdit={handleEditRow}
        onDelete={handleDeleteRow}
      />
    ) : null;

  const rows = data?.data ?? [];
  const [density, setDensity] = useDensity();
  const pagination = data?.pagination;
  const isFiltered =
    !!debouncedSearch.trim() || partyTypeFilter !== "ALL" || roleFilter !== "ALL";

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search parties…"
        value={search}
        onValueChange={handleSearchChange}
      />
      {/*
        No `ml-auto` here. FILTER_TOOLBAR_ROW is a `flex-nowrap overflow-x-auto`
        strip with a hidden scrollbar, so pushing an item right does not move it
        to the right-hand edge — it pushes it into the scroll overflow, past the
        viewport, where there is no visible scrollbar to reveal it. The control
        was rendering at x=1569 on a 1280-wide screen.
      */}
      <DensityToggle density={density} onChange={setDensity} />
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
      <Select
        value={roleFilter}
        onValueChange={(value) => {
          setRoleFilter(value);
          setPage(1);
        }}
      >
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Filter by role">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All roles</SelectItem>
          <SelectItem value="CUSTOMER">Customer</SelectItem>
          <SelectItem value="VENDOR">Vendor</SelectItem>
          <SelectItem value="PARTNER">Partner</SelectItem>
          <SelectItem value="PROSPECT">Prospect</SelectItem>
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
              <RecordList
                layout={PARTY_LAYOUT}
                rows={rows as unknown as RecordValue[]}
                actions={renderRowActions}
                getRowKey={(row) => String(row.partyId)}
                onRowClick={handleRowClick}
                density={density}
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

      {openPartyId !== null && (
        <PartyDetailSheet partyId={openPartyId} onOpenChange={handleDetailOpenChange} />
      )}

      {deleteTarget && (
        <PartyDeleteDialog
          partyName={deleteTarget.name}
          open
          onOpenChange={handleDeleteDialogChange}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </PageWrapper>
  );
}
