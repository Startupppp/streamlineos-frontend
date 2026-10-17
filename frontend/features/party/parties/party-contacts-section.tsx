"use client";

import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppDialog } from "@/components/shared/app-dialog";
import { RecordForm, RecordList, type RecordFormValues } from "@/components/renderer";
import { PARTY_CONTACT_LAYOUT } from "@/lib/renderer/party-contact-layout";
import { useCan } from "@/hooks/api/access";
import {
  useDeletePartyContact,
  usePartyContacts,
  useSavePartyContact,
  type PartyContactInput,
} from "@/hooks/api/party/party-contacts";
import type { PartyContact } from "@/hooks/api/party/party-schema";
import { getErrorMessage } from "@/lib/get-error-message";

interface PartyContactsSectionProps {
  partyId: string;
}

/** Form strings to the API's shape: blanks clear, the flag becomes a boolean. */
function toInput(values: RecordFormValues): PartyContactInput {
  const text = (name: string) => (values[name] ?? "").trim() || null;
  return {
    firstName: (values.firstName ?? "").trim(),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    isPrimary: values.isPrimary === "true",
  };
}

function contactRowKey(row: PartyContact) {
  return row.partyContactId;
}

interface ContactRowActionsProps {
  contact: PartyContact;
  onEdit: (contact: PartyContact) => void;
  onDelete: (contact: PartyContact) => void;
}

const ContactRowActions = memo(function ContactRowActions({ contact, onEdit, onDelete }: ContactRowActionsProps) {
  function handleEdit() {
    onEdit(contact);
  }
  function handleDelete() {
    onDelete(contact);
  }
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
      <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>Delete</Button>
    </div>
  );
});

/** The people at a party (`/party/parties/:id/contacts`), listed and edited in place. */
export function PartyContactsSection({ partyId }: PartyContactsSectionProps) {
  const canManage = useCan("party:contacts:manage");
  const contacts = usePartyContacts(partyId);
  const save = useSavePartyContact(partyId);
  const remove = useDeletePartyContact(partyId);
  const [editing, setEditing] = useState<PartyContact | "new" | null>(null);
  const [deleting, setDeleting] = useState<PartyContact | null>(null);

  const handleEdit = useCallback((contact: PartyContact) => setEditing(contact), []);
  const handleDelete = useCallback((contact: PartyContact) => setDeleting(contact), []);
  const renderActions = useCallback(
    (row: PartyContact) => <ContactRowActions contact={row} onEdit={handleEdit} onDelete={handleDelete} />,
    [handleEdit, handleDelete],
  );

  function handleAdd() {
    setEditing("new");
  }
  function handleCloseForm() {
    setEditing(null);
  }
  function handleFormOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }
  function handleSubmit(values: RecordFormValues) {
    const partyContactId = editing && editing !== "new" ? editing.partyContactId : undefined;
    save.mutate(
      { partyContactId, input: toInput(values) },
      {
        onSuccess: () => {
          toast.success(partyContactId ? "Contact updated" : "Contact added");
          setEditing(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }
  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleting(null);
  }
  function handleConfirmDelete() {
    if (!deleting) return;
    remove.mutate(deleting.partyContactId, {
      onSuccess: () => {
        toast.success("Contact deleted");
        setDeleting(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (contacts.access.denied) return null;
  const rows = contacts.data ?? [];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-label font-medium text-muted-foreground">Contacts</h2>
        {canManage ? (
          <Button type="button" variant="ghost" size="sm" className="px-2 text-xs" onClick={handleAdd}>
            Add contact
          </Button>
        ) : null}
      </div>
      {contacts.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : contacts.isError ? (
        <p className="text-sm text-muted-foreground">{getErrorMessage(contacts.error)}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <RecordList
          layout={PARTY_CONTACT_LAYOUT}
          rows={rows}
          getRowKey={contactRowKey}
          actions={canManage ? renderActions : undefined}
          pagination={{ pageSize: 10 }}
        />
      )}

      {canManage ? (
        <AppDialog
          open={editing !== null}
          onOpenChange={handleFormOpenChange}
          title={editing === "new" ? "Add a contact" : "Edit contact"}
        >
          <RecordForm
            key={editing === null ? "closed" : editing === "new" ? "new" : editing.partyContactId}
            layout={PARTY_CONTACT_LAYOUT}
            mode={editing === "new" ? "create" : "edit"}
            initial={editing && editing !== "new" ? editing : undefined}
            onSubmit={handleSubmit}
            onCancel={handleCloseForm}
            isSubmitting={save.isPending}
            submitLabel={editing === "new" ? "Add contact" : "Save changes"}
          />
        </AppDialog>
      ) : null}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this contact?"
        description={deleting ? `${deleting.firstName} ${deleting.lastName ?? ""}`.trim() + " is removed from this party." : ""}
        confirmLabel="Delete contact"
        destructive
        isPending={remove.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
