"use client";

import { useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, Plus } from "lucide-react";
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
import { CreateTaskDialog } from "@/features/crm/tasks/create-task-dialog";

function ContactDetailSkeleton() {
  return (
    <PageWrapper title="Contact" subtitle="Loading...">
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-48 rounded-2xl" />
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

  const { data: contact, isLoading } = useContactDetail(id);
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
      onError: (e) => toast.error(e.message),
    });
  }, [id, deleteMutation, router]);

  if (isLoading) return <ContactDetailSkeleton />;

  if (!contact) {
    return (
      <PageWrapper title="Not Found" subtitle="">
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted or you don't have access."
          action={{ label: "Back to Contacts", href: "/crm/contacts" }}
          className="min-h-[50vh]"
        />
      </PageWrapper>
    );
  }

  const openDealsCount = contact.dealId != null ? 1 : 0;

  return (
    <>
      <PageWrapper
        title={contact.name}
        eyebrow="Contacts"
        subtitle={[contact.title, contact.company].filter(Boolean).join(" · ") || undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handleOpenLogActivity}
            >
              <Plus className="h-3.5 w-3.5" />
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
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
              <Link href="/crm/contacts">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Link>
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
