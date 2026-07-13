"use client";

import { useState, useCallback, useTransition, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Download, GitMerge, LayoutGrid, Plus, Search, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CrmOptionSelect } from "@/features/crm/shared/metadata";
import { ErrorState } from "@/components/shared";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { staggerContainer } from "@/lib/motion-variants";
import { useContacts, useDeleteContact } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { CreateContactDialog } from "@/features/crm/contacts/create-contact-dialog";
import { EditContactSheet } from "@/features/crm/contacts/edit-contact-sheet";
import { ContactsCsvImportDialog } from "@/features/crm/contacts/contacts-csv-import-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PAGE_SIZE } from "@/features/crm/contacts/contacts-constants";
import { useEnrichContact } from "@/features/crm/contacts/contact-actions-menu";
import { ContactTableView } from "@/features/crm/contacts/contact-table-view";
import { ContactCardView } from "@/features/crm/contacts/contact-card-view";
import { ContactDeleteDialog } from "@/features/crm/contacts/contact-delete-dialog";
import { ContactMergeDialog } from "@/features/crm/contacts/detail/contact-merge-dialog";
import type { Contact, DuplicateContactPair } from "@/types/crm";

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMergeOpen, setBulkMergeOpen] = useState(false);
  const deleteContact = useDeleteContact();
  const enrichContact = useEnrichContact();

  const view = (searchParams.get("view") || "table") as "table" | "card";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const sourceFilter = searchParams.get("source") || "all";
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(search, 300);
  const trimmedDebounced = debouncedSearch.trim();
  const apiSearch =
    trimmedDebounced.length >= 3 || trimmedDebounced.length === 0
      ? trimmedDebounced
      : "";

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
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, error, refetch } = useContacts({
    search: apiSearch || undefined,
    source: sourceFilter !== "all" ? sourceFilter : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleViewTable = useCallback(
    () => updateParams({ view: null }),
    [updateParams],
  );
  const handleViewCard = useCallback(
    () => updateParams({ view: "card" }),
    [updateParams],
  );
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      updateParams({ source: value !== "all" ? value : null, page: null });
    },
    [updateParams],
  );

  const handleExport = useCallback(() => {
    toast.info("Export not yet supported");
  }, []);

  const handleEdit = useCallback((contact: Contact) => {
    setEditContact(contact);
  }, []);

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditContact(null);
  }, []);

  const handleEnrich = useCallback(
    (contact: Contact) => {
      enrichContact.mutate(
        { name: contact.name, email: contact.email, company: contact.company },
        {
          onSuccess: (result) => {
            toast.success(
              `Enriched: ${result.industry} — ${result.estimatedCompanySize}`,
              { description: result.recommendedApproach, duration: 6000 },
            );
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [enrichContact],
  );

  const handleRequestDelete = useCallback((id: number) => {
    setDeleteId(id);
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

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage > 1 ? String(newPage) : null });
    },
    [updateParams],
  );

  const handleBulkMerge = useCallback(() => {
    setBulkMergeOpen(true);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkMergePair = useMemo<DuplicateContactPair | null>(() => {
    if (selectedIds.size !== 2) return null;
    const [id1, id2] = [...selectedIds];
    if (id1 === undefined || id2 === undefined) return null;
    const c1 = data?.items.find((c) => c.id === id1);
    const c2 = data?.items.find((c) => c.id === id2);
    if (!c1 || !c2) return null;
    return {
      contact1: { id: c1.id, name: c1.name, email: c1.email ?? null, phone: c1.phone ?? null },
      contact2: { id: c2.id, name: c2.name, email: c2.email ?? null, phone: c2.phone ?? null },
      matchReason: "name" as const,
    };
  }, [selectedIds, data?.items]);

  if (isLoading) {
    return (
      <PageWrapper title="Contacts" subtitle="Loading...">
        <DataTableSkeleton rows={8} columns={7} className="flex-1" />
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Contacts" subtitle="People directory">
        <ErrorState
          title="Failed to load contacts"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const sharedViewProps = {
    items: data?.items ?? [],
    total,
    page,
    totalPages,
    apiSearch,
    isEnrichPending: enrichContact.isPending,
    onRequestDelete: handleRequestDelete,
    onEdit: handleEdit,
    onEnrich: handleEnrich,
    onPageChange: handlePageChange,
    onOpenCreate: handleOpenCreate,
  };

  return (
    <>
      <PageWrapper
        title="Contacts"
        subtitle={`${total} contacts`}
        actions={
          <>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={handleViewTable}
                aria-label="Table view"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={view === "card" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={handleViewCard}
                aria-label="Card view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ContactsCsvImportDialog onSuccess={handleRetry} />
            <Button onClick={handleOpenCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Contact
            </Button>
            <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
          </>
        }
        filters={
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search contacts (min 3 chars)..."
                value={search}
                onChange={handleSearchChange}
                className="h-8 w-full min-w-0 pl-8 text-xs"
              />
            </div>
            <div className="hidden min-w-0 items-center gap-2 sm:flex lg:gap-3">
              <CrmOptionSelect
                type="source"
                value={sourceFilter}
                onChange={handleSourceChange}
                placeholder="All sources"
                allowAll
                className="w-[140px]"
              />
            </div>
            <div className="ml-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleExport}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        }
      >
        <motion.div
          className="flex flex-1 min-h-0 flex-col space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="font-medium">{selectedIds.size} selected</span>
              <div className="ml-auto flex items-center gap-2">
                {selectedIds.size === 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleBulkMerge}
                  >
                    <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                    Merge
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleClearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          {view === "table" && (
            <ContactTableView
              {...sharedViewProps}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
          {view === "card" && <ContactCardView {...sharedViewProps} />}
        </motion.div>
      </PageWrapper>

      {editContact && (
        <EditContactSheet
          key={editContact.id}
          contact={editContact}
          open
          onOpenChange={handleEditOpenChange}
        />
      )}

      <ContactDeleteDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={handleConfirmDelete}
      />

      {bulkMergePair && (
        <ContactMergeDialog
          pair={bulkMergePair}
          currentContactId={bulkMergePair.contact1.id}
          open={bulkMergeOpen}
          onOpenChange={(open) => {
            setBulkMergeOpen(open);
            if (!open) setSelectedIds(new Set());
          }}
          onMergeComplete={handleClearSelection}
        />
      )}
    </>
  );
}
