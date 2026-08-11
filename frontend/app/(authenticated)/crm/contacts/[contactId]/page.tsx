"use client";

import { useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useContactDetail, useDeleteContact } from "@/hooks/api/crm";
import { EditContactSheet } from "@/features/crm/contacts/edit-contact-sheet";
import { EmailComposeDialog } from "@/features/crm/shared/email-compose-dialog";
import { CallLogDialog } from "@/features/crm/shared/call-log-dialog";
import { ContactInfoCard } from "@/features/crm/contacts/detail/contact-info-card";
import { ContactStatsBar } from "@/features/crm/contacts/detail/contact-stats-bar";
import { ContactTimeline } from "@/features/crm/contacts/detail/contact-timeline";
import { ContactRelatedDeals } from "@/features/crm/contacts/detail/contact-related-deals";
import { ContactNotes } from "@/features/crm/contacts/detail/contact-notes";
import { ContactRolesCard } from "@/features/crm/contacts/detail/contact-roles-card";
import { ContactDuplicateBanner } from "@/features/crm/contacts/detail/contact-merge-dialog";
import { CreateTaskDialog } from "@/features/crm/tasks/create-task-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared";
import { ContactInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";

function ContactDetailSkeleton() {
  return (
    <PageWrapper title="Contact" subtitle="Loading..." backHref="/crm/contacts">
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-lg" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </PageWrapper>
  );
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = use(params);
  const id = Number(contactId);
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const { data: contact, isLoading, isError, error, refetch } = useContactDetail(id);
  const deleteMutation = useDeleteContact();

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleEditOpenChange = useCallback((open: boolean) => setEditOpen(open), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => setDeleteOpen(open), []);
  const handleOpenLogActivity = useCallback(() => setLogActivityOpen(true), []);
  const handleLogActivityOpenChange = useCallback((open: boolean) => setLogActivityOpen(open), []);
  const handleSendEmail = useCallback(() => setEmailOpen(true), []);
  const handleLogCall = useCallback(() => setCallOpen(true), []);

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Contact deleted");
        router.push("/crm/contacts");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, deleteMutation, router]);

  const handleRefetch = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) return <ContactDetailSkeleton />;

  if (isError) {
    return (
      <PageWrapper title="Contact" subtitle="" backHref="/crm/contacts">
        <ErrorState
          description={getErrorMessage(error)}
          onRetry={handleRefetch}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!contact) {
    return (
      <PageWrapper title="Not Found" subtitle="" backHref="/crm/contacts">
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted or you don't have access."
          action={{ label: "Back to Contacts", href: "/crm/contacts" }}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const openDealsCount = contact.dealId != null ? 1 : 0;

  return (
    <>
      <PageWrapper
        title={contact.name}
        subtitle={[contact.title, contact.company].filter(Boolean).join(" · ") || undefined}
        backHref="/crm/contacts"
        actions={
          <div className="flex items-center gap-2">
            <ContactInlineAiMenu
              contactId={id}
              contactName={contact.name}
              contactEmail={contact.email}
            />
            <Button size="sm" onClick={handleOpenLogActivity}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Log Activity
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleOpenEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleOpenDelete}
              aria-label="Delete contact"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={id}
            className="space-y-5"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ContactDuplicateBanner contactId={id} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                <ContactInfoCard
                  contact={contact}
                  onEdit={handleOpenEdit}
                  onSendEmail={handleSendEmail}
                  onLogCall={handleLogCall}
                  entityId={id}
                />
                <ContactStatsBar contactId={id} openDealsCount={openDealsCount} />
                <ContactRolesCard contactId={id} />
              </div>

              <div className="lg:col-span-2 space-y-4">
                <ContactTimeline contactId={id} onLogActivity={handleOpenLogActivity} />
                <ContactNotes contactId={id} initialNotes={contact.notes} />
              </div>
            </div>

            <ContactRelatedDeals contact={contact} />
          </motion.div>
        </AnimatePresence>
      </PageWrapper>

      {editOpen && (
        <EditContactSheet
          key={contact.id}
          contact={contact}
          open={editOpen}
          onOpenChange={handleEditOpenChange}
        />
      )}

      <EmailComposeDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        toEmail={contact?.email}
        entityType="CONTACT"
        entityId={id}
      />

      <CallLogDialog
        open={callOpen}
        onOpenChange={setCallOpen}
        entityType="CONTACT"
        entityId={id}
      />

      <CreateTaskDialog
        open={logActivityOpen}
        onOpenChange={handleLogActivityOpenChange}
        defaultEntityType="CONTACT"
        defaultEntityId={id}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title="Delete contact"
        description={`Are you sure you want to delete "${contact.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
