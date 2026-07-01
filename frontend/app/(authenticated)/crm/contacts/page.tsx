"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  MoreHorizontal,
  Pencil,
  Trash2,
  TableIcon,
  LayoutGrid,
  Link2,
  Sparkles,
  Twitter,
  Globe,
  Plus,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, SkeletonTable } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useContacts, useDeleteContact } from "@/hooks/api/crm";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { CreateContactDialog } from "@/features/crm/contacts/create-contact-dialog";
import { EditContactSheet } from "@/features/crm/contacts/edit-contact-sheet";
import { ContactsCsvImportDialog } from "@/features/crm/contacts/contacts-csv-import-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import type { LeadEnrichmentResult } from "@/lib/ai/schemas";
import type { Contact } from "@/types/crm";

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  social_media: "Social Media",
  other: "Other",
};

function useEnrichContact() {
  return useMutation({
    mutationKey: ["contacts", "enrich"] as const,
    mutationFn: (input: {
      name: string;
      email?: string | null;
      company?: string | null;
    }) =>
      apiClient.post<LeadEnrichmentResult>("/ai/enrich-lead", {
        name: input.name,
        email: input.email ?? undefined,
        company: input.company ?? undefined,
      }),
  });
}

interface ContactActionsMenuProps {
  contact: Contact;
  isEnrichPending: boolean;
  onDelete: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onEnrich: (contact: Contact) => void;
  triggerClassName?: string;
}

function ContactActionsMenu({
  contact,
  isEnrichPending,
  onDelete,
  onEdit,
  onEnrich,
  triggerClassName,
}: ContactActionsMenuProps) {
  const router = useRouter();

  const handleView = useCallback(() => {
    router.push(`/crm/contacts/${contact.id}`);
  }, [contact.id, router]);

  const handleEdit = useCallback(() => {
    onEdit(contact);
  }, [contact, onEdit]);

  const handleEnrich = useCallback(() => {
    onEnrich(contact);
  }, [contact, onEnrich]);

  const handleDelete = useCallback(() => {
    onDelete(contact.id);
  }, [contact.id, onDelete]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", triggerClassName)}
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Link2 className="h-3.5 w-3.5 mr-2" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isEnrichPending} onClick={handleEnrich}>
          <Sparkles className="h-3.5 w-3.5 mr-2 text-blue-600" />
          Enrich with AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
                className={cn("rounded-r-none", view === "table" && "")}
                onClick={handleViewTable}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "card" ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-l-none", view === "card" && "")}
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
          {view === "table" && (
            <motion.div variants={fadeUp}>
              <div className="border border-border rounded-md flex flex-col h-[calc(100dvh-16rem)] min-h-[320px]">
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="min-w-max">
                    <table className="w-full caption-bottom text-[11px]">
                      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        <TableRow className="border-b-2 border-border">
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Name
                          </TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Email
                          </TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Phone
                          </TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Company
                          </TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Source
                          </TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                            Created
                          </TableHead>
                          <TableHead className="text-[10px] w-8 px-2" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.items ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <EmptyState
                                illustration={
                                  <EmptyTeamIllustration className="w-28 h-28" />
                                }
                                title="No contacts found"
                                description={
                                  apiSearch
                                    ? "No contacts match your search."
                                    : "Create your first contact to get started."
                                }
                                action={
                                  apiSearch
                                    ? undefined
                                    : {
                                        label: "New Contact",
                                        onClick: handleOpenCreate,
                                      }
                                }
                                className="border-0 bg-transparent min-h-[40vh]"
                              />
                            </TableCell>
                          </TableRow>
                        ) : (
                          data?.items.map((contact) => (
                            <TableRow
                              key={contact.id}
                              className="h-8 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="px-2 py-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[9px] font-bold text-blue-600 shrink-0">
                                    {contact.name[0]?.toUpperCase() ?? "?"}
                                  </div>
                                  <Link
                                    href={`/crm/contacts/${contact.id}`}
                                    className="text-[12px] font-medium truncate max-w-[120px] hover:text-blue-600 hover:underline transition-colors"
                                  >
                                    {contact.name}
                                  </Link>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-1 truncate max-w-[140px]">
                                {contact.email ? (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-[11px] text-blue-600 hover:underline truncate"
                                  >
                                    {contact.email}
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                {contact.phone ? (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="text-[11px] text-muted-foreground font-mono hover:text-foreground transition-colors"
                                  >
                                    {contact.phone}
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[11px] text-muted-foreground px-2 py-1 truncate max-w-[100px]">
                                {contact.company || "—"}
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                {contact.source ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1.5 py-0 h-4"
                                  >
                                    {SOURCE_LABELS[contact.source] ?? contact.source}
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[11px] text-muted-foreground px-2 py-1 whitespace-nowrap">
                                {contact.createdAt
                                  ? new Date(contact.createdAt).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                <ContactActionsMenu
                                  contact={contact}
                                  isEnrichPending={enrichContact.isPending}
                                  onDelete={handleRequestDelete}
                                  onEdit={handleEdit}
                                  onEnrich={handleEnrich}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </table>
                  </div>
                </div>
                <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
                  {total > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Showing {firstItem}–{lastItem} of {total} contacts
                    </span>
                  ) : (
                    <span />
                  )}
                  {totalPages > 1 && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={handlePrevPage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={handleNextPage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === "card" && (
            <>
              <motion.div
                variants={fadeUp}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {data?.items.map((contact) => (
                  <Card
                    key={contact.id}
                    className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-blue-500/40 group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold text-blue-600 shrink-0">
                          {contact.name[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                            {contact.name}
                          </p>
                          {contact.title && (
                            <p className="text-xs text-muted-foreground truncate">
                              {contact.title}
                            </p>
                          )}
                        </div>
                        <ContactActionsMenu
                          contact={contact}
                          isEnrichPending={enrichContact.isPending}
                          onDelete={handleRequestDelete}
                          onEdit={handleEdit}
                          onEnrich={handleEnrich}
                          triggerClassName="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a
                              href={`mailto:${contact.email}`}
                              className="truncate hover:text-foreground transition-colors"
                            >
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a
                              href={`tel:${contact.phone}`}
                              className="hover:text-foreground transition-colors"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.company}</span>
                          </div>
                        )}
                      </div>
                      {(contact.linkedinUrl ||
                        contact.twitterUrl ||
                        contact.websiteUrl) && (
                        <div className="mt-3 flex items-center gap-2">
                          {contact.linkedinUrl && (
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="LinkedIn profile"
                              className="text-muted-foreground hover:text-blue-500 transition-colors"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.twitterUrl && (
                            <a
                              href={contact.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Twitter profile"
                              className="text-muted-foreground hover:text-sky-500 transition-colors"
                            >
                              <Twitter className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact.websiteUrl && (
                            <a
                              href={contact.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Website"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {contact.source && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {SOURCE_LABELS[contact.source] ?? contact.source}
                          </Badge>
                        )}
                        {contact.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {(contact.lead || contact.deal) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {contact.lead && (
                            <Link href={`/crm/leads/${contact.lead.id}`}>
                              <Badge
                                variant="secondary"
                                className="text-[10px] text-blue-600 border-blue-200 hover:border-blue-400 gap-1 cursor-pointer"
                              >
                                <Link2 className="h-2.5 w-2.5" />
                                Lead: {contact.lead.name}
                              </Badge>
                            </Link>
                          )}
                          {contact.deal && (
                            <Link href={`/crm/deals/${contact.deal.id}`}>
                              <Badge
                                variant="secondary"
                                className="text-[10px] text-amber-700 border-amber-200 hover:border-amber-400 gap-1 cursor-pointer"
                              >
                                <Link2 className="h-2.5 w-2.5" />
                                Deal: {contact.deal.name}
                              </Badge>
                            </Link>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </motion.div>

              {(data?.items.length ?? 0) === 0 && (
                <EmptyState
                  illustration={<EmptyTeamIllustration className="w-36 h-36" />}
                  title="No contacts found"
                  description={
                    apiSearch
                      ? "No contacts match your search."
                      : "Create your first contact to get started."
                  }
                  action={
                    apiSearch
                      ? undefined
                      : { label: "New Contact", onClick: handleOpenCreate }
                  }
                  className="min-h-[50vh]"
                />
              )}

              {totalPages > 1 && (
                <motion.div
                  variants={fadeUp}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-muted-foreground">
                    Showing {firstItem}–{lastItem} of {total} contacts
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={handlePrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={handleNextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}
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

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The contact will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
