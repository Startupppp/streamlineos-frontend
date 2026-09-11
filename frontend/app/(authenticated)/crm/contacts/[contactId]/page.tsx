"use client";

import { use, useCallback, useState } from "react";
import { useCanState } from "@/hooks/api/access";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordDetail, asRecordValue } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { CONTACT_LAYOUT } from "@/lib/renderer/crm/contact-layout";
import { useContactDetail, useDeleteContact } from "@/hooks/api/crm";
import { ContactSheet } from "@/features/crm/contacts/contact-sheet";
import { EmailComposeDialog } from "@/features/crm/shared/email-compose-dialog";
import { CallLogDialog } from "@/features/crm/shared/call-log-dialog";
import { ContactQuickActions } from "@/features/crm/contacts/detail/contact-quick-actions";
import { ContactStatsBar } from "@/features/crm/contacts/detail/contact-stats-bar";
import { ContactTimeline } from "@/features/crm/contacts/detail/contact-timeline";
import { ContactRelatedDeals } from "@/features/crm/contacts/detail/contact-related-deals";
import { ContactNotes } from "@/features/crm/contacts/detail/contact-notes";
import { ContactRolesCard } from "@/features/crm/contacts/detail/contact-roles-card";
import { ContactConsentCard } from "@/features/crm/contacts/detail/contact-consent-card";
import { ContactDuplicateBanner } from "@/features/crm/contacts/detail/contact-duplicate-banner";
import { CreateTaskDialog } from "@/features/crm/tasks/create-task-dialog";
import { ContactInlineAiMenu } from "@/features/crm/shared/crm-inline-ai-menu";
import { getErrorMessage } from "@/lib/get-error-message";

function ContactDetailSkeleton() {
  return (
    <PageWrapper title="Contact" backHref="/crm/contacts">
      <div className="flex flex-col gap-gap-toolbar">
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-gap-toolbar">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div className="flex flex-col gap-gap-toolbar lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
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
  const layout = useTenantLayout(CONTACT_LAYOUT);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const { data: contact, isLoading, isError, error, refetch } = useContactDetail(id);
  const deleteMutation = useDeleteContact();

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleOpenLogActivity = useCallback(() => setLogActivityOpen(true), []);
  const handleSendEmail = useCallback(() => setEmailOpen(true), []);
  const handleLogCall = useCallback(() => setCallOpen(true), []);
  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Contact deleted");
        router.push("/crm/contacts");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, deleteMutation, router]);

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:contacts:view") === "denied")
    return <NoPermissionState permission="crm:contacts:view" />;

  if (isLoading) return <ContactDetailSkeleton />;

  if (isError)
    return (
      <PageWrapper title="Contact" backHref="/crm/contacts">
        <ErrorState
          title="Couldn't load this contact"
          description={getErrorMessage(error)}
          onRetry={handleRefetch}
          className="flex-1"
        />
      </PageWrapper>
    );

  if (!contact)
    return (
      <PageWrapper title="Not found" backHref="/crm/contacts">
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted, or you don't have access to it."
          action={{ label: "Back to contacts", href: "/crm/contacts" }}
          className="flex-1"
        />
      </PageWrapper>
    );

  const record = asRecordValue({
    ...contact,
    tags: contact.tags.join(", "),
    organizationName: contact.crmOrganization?.name ?? null,
  });

  return (
    <PageWrapper
      title={contact.name}
      subtitle={[contact.title, contact.company].filter(Boolean).join(" · ") || undefined}
      backHref="/crm/contacts"
      actions={
        <div className="flex items-center gap-gap-field">
          <ContactInlineAiMenu
            contactId={id}
            contactName={contact.name}
            contactEmail={contact.email}
          />
          <Button size="sm" onClick={handleOpenLogActivity}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log activity
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleOpenDelete}
            aria-label="Delete contact"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-gap-section">
        <ContactDuplicateBanner partyId={contact.partyId} />

        <RecordDetail layout={layout} record={record} showTitle={false} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-gap-toolbar">
            <ContactQuickActions
              contact={contact}
              onSendEmail={handleSendEmail}
              onLogCall={handleLogCall}
            />
            <ContactStatsBar contactId={id} openDealsCount={contact.dealId != null ? 1 : 0} />
            <ContactRolesCard contactId={id} />
            <ContactConsentCard contactId={id} />
          </div>

          <div className="flex min-w-0 flex-col gap-gap-toolbar lg:col-span-2">
            <ContactTimeline contactId={id} onLogActivity={handleOpenLogActivity} />
            <ContactNotes contactId={id} initialNotes={contact.notes} />
          </div>
        </div>

        <ContactRelatedDeals contact={contact} />
      </div>

      {editOpen ? (
        <ContactSheet open onOpenChange={setEditOpen} contact={contact} />
      ) : null}

      <EmailComposeDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        toEmail={contact.email}
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
        onOpenChange={setLogActivityOpen}
        defaultEntityType="CONTACT"
        defaultEntityId={id}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete contact"
        description={`Delete "${contact.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
