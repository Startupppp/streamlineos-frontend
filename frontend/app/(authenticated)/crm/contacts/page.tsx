"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Download, LayoutGrid, Plus, Search, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState, SkeletonTable } from "@/components/shared";
import { staggerContainer } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
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
import type { Contact } from "@/types/crm";

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const deleteContact = useDeleteContact();
  const enrichContact = useEnrichContact();

  const view = (searchParams.get("view") || "table") as "table" | "card";
  const searchInput = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;

  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const apiSearch =
    debouncedSearch.length >= 3 || debouncedSearch.length === 0
      ? debouncedSearch
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

  const { data, isLoading, error, refetch } = useContacts({
    search: apiSearch || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const firstItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(page * PAGE_SIZE, total);

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
      updateParams({ q: e.target.value || null, page: null });
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

  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [page, updateParams],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [page, updateParams],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Contacts" subtitle="People directory">
        <SkeletonTable
          rows={8}
          columns={7}
          className="h-[calc(100dvh-16rem)]"
        />
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

  const viewProps = {
    items: data?.items ?? [],
    total,
    page,
    totalPages,
    firstItem,
    lastItem,
    apiSearch,
    isEnrichPending: enrichContact.isPending,
    onRequestDelete: handleRequestDelete,
    onEdit: handleEdit,
    onEnrich: handleEnrich,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onOpenCreate: handleOpenCreate,
  };

  return (
    <>
      <PageWrapper
        title="Contacts"
        subtitle={`${total} contacts`}
        actions={
          <>
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-r-none")}
                onClick={handleViewTable}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "card" ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-l-none")}
                onClick={handleViewCard}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <ContactsCsvImportDialog onSuccess={handleRetry} />
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" /> New Contact
            </Button>
            <CreateContactDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
            />
          </>
        }
        filters={
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts (min 3 chars)..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs"
            />
          </div>
        }
      >
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {view === "table" && <ContactTableView {...viewProps} />}
          {view === "card" && <ContactCardView {...viewProps} />}
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
    </>
  );
}
