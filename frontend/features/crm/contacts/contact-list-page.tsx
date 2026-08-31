"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { CONTACT_LAYOUT } from "@/lib/renderer/crm/contact-layout";
import { useContacts, useDeleteContact, useExportContacts } from "@/hooks/api/crm";
import { useCan } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { downloadBlob } from "@/lib/download-blob";
import { getErrorMessage } from "@/lib/get-error-message";
import { PAGE_SIZE } from "./contacts-constants";
import { ContactSheet } from "./contact-sheet";
import { ContactDeleteDialog } from "./contact-delete-dialog";
import {
  ContactSelectionBar,
  useContactMergeSelection,
} from "./contact-merge-selection";
import { ContactMergeDialog } from "./detail/contact-merge-dialog";
import {
  ContactActionsMenu,
  useEnrichContact,
} from "./contact-actions-menu";
import { ImportLinkButton } from "@/features/crm/import/import-link-button";
import type { Contact } from "@/types/crm";

function stopRowClick(event: React.MouseEvent) {
  event.stopPropagation();
}

export function ContactListPage() {
  const canManageContacts = useCan("crm:contacts:manage");
  const canMergeContacts = useCan("crm:contacts:merge");
  const canViewContacts = useCan("crm:contacts:view");

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const layout = useTenantLayout(CONTACT_LAYOUT);
  const [density, setDensity] = useDensity();
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteContact = useDeleteContact();
  const enrichContact = useEnrichContact();
  const exportContacts = useExportContacts();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedSearch = debouncedSearch.trim();
  const apiSearch = trimmedSearch.length >= 3 ? trimmedSearch : "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    setCursorHistory([undefined]);
    updateParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, updateParams]);

  const currentCursor = cursorHistory[cursorHistory.length - 1];

  const { data, isLoading, isError, error, refetch, access, isFetching } = useContacts({
    search: apiSearch || undefined,
    limit: PAGE_SIZE,
    cursor: currentCursor,
  });

  const contacts = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? contacts.length;
  const isFiltered = apiSearch.length > 0;

  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );
  const merge = useContactMergeSelection(contactsById);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenCreate = useCallback(() => openCreate(), [openCreate]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setCursorHistory([undefined]);
    updateParams({ q: null });
  }, [updateParams]);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => (history.length > 1 ? history.slice(0, -1) : history));
  }, []);

  const handleNextPage = useCallback(() => {
    const next = data?.nextCursor;
    if (!next) return;
    setCursorHistory((history) => [...history, next]);
  }, [data?.nextCursor]);

  const handleExport = useCallback(() => {
    exportContacts.mutate(undefined, {
      onSuccess: (blob) => downloadBlob(blob, "contacts.csv"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [exportContacts]);

  const handleEnrich = useCallback(
    (contact: Contact) => {
      enrichContact.mutate(
        { name: contact.name, email: contact.email, company: contact.company },
        {
          onSuccess: (result) =>
            toast.success(`Enriched: ${result.industry} — ${result.estimatedCompanySize}`, {
              description: result.recommendedApproach,
              duration: 6000,
            }),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [enrichContact],
  );

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditContact(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteContact.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        setDeleteId(null);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteContact]);

  const rowActions = useCallback(
    (row: RecordValue) => {
      const contact = contactsById.get(Number(row.id));
      if (!contact) return null;
      return (
        <div className="flex items-center justify-end gap-gap-inline" onClick={stopRowClick}>
          {canMergeContacts ? (
            <Checkbox
              checked={merge.selectedIds.has(contact.id)}
              onCheckedChange={() => merge.toggle(contact.id)}
              aria-label={`Select ${contact.name}`}
            />
          ) : null}
          <ContactActionsMenu
            contact={contact}
            isEnrichPending={enrichContact.isPending}
            onDelete={setDeleteId}
            onEdit={setEditContact}
            onEnrich={handleEnrich}
          />
        </div>
      );
    },
    [contactsById, canMergeContacts, merge, enrichContact.isPending, handleEnrich],
  );

  return (
    <PageWrapper
      title="Contacts"
      subtitle="The people you deal with at each company"
      actions={
        canManageContacts ? (
          <>
            <ImportLinkButton entity="contacts" />
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New contact
            </Button>
          </>
        ) : undefined
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <DensityToggle density={density} onChange={setDensity} />
          {canViewContacts ? (
            <LoadingButton
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={handleExport}
              isPending={exportContacts.isPending}
              disabled={total === 0}
              title={total === 0 ? "No contacts to export" : undefined}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </LoadingButton>
          ) : null}
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-toolbar">
        {canMergeContacts ? <ContactSelectionBar selection={merge} /> : null}

        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load contacts"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : contacts.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyPersonIllustration />}
            title="No contacts yet"
            description={
              isFiltered
                ? "No results match your filters."
                : "Contacts are the people you deal with at each company. Add one, or import a CSV to bring your existing list in."
            }
            filtersActive={isFiltered}
            onClearFilters={handleClearFilters}
            action={!isFiltered && canManageContacts ? { label: "Add contact", onClick: handleOpenCreate } : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(contacts)}
            getRowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/crm/contacts/${String(row.id)}`)}
            actions={rowActions}
            density={density}
            minWidth="820px"
            pagination={{ pageSize: PAGE_SIZE }}
            className={CONTENT_FILL_PANEL}
          />
        )}
        {!isLoading && !isError && (cursorHistory.length > 1 || data?.hasMore) ? (
          <CursorPageControls
            page={cursorHistory.length}
            hasNext={data?.hasMore ?? false}
            disabled={isFetching}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
          />
        ) : null}
      </div>

      {createOpen ? <ContactSheet open onOpenChange={setCreateOpen} /> : null}

      {editContact ? (
        <ContactSheet open onOpenChange={handleEditOpenChange} contact={editContact} />
      ) : null}

      {canManageContacts ? (
        <ContactDeleteDialog
          open={deleteId !== null}
          onOpenChange={handleDeleteOpenChange}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {canMergeContacts && merge.pair ? (
        <ContactMergeDialog
          pair={merge.pair}
          currentContactId={merge.pair.contact1.id}
          open={merge.isOpen}
          onOpenChange={merge.onOpenChange}
          onMergeComplete={merge.clear}
        />
      ) : null}
    </PageWrapper>
  );
}
