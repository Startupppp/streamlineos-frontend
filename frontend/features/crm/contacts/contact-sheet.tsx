"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Combobox } from "@/components/ui/combobox";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { CONTACT_LAYOUT } from "@/lib/renderer/crm/contact-layout";
import { useCreateContact, useDeals, useUpdateContact } from "@/hooks/api/crm";
import { useCan } from "@/hooks/api/access";
import { useLeads } from "@/hooks/api/leads";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Contact, CreateContactInput, UpdateContactInput } from "@/types/crm";

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

function tagsFrom(value: string | undefined): string[] {
  return text(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function numberOrUndefined(value: string): number | undefined {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) ? parsed : undefined;
}

function forCreate(values: RecordFormValues, leadId: string, dealId: string): CreateContactInput {
  return {
    name: text(values.name),
    email: text(values.email) || undefined,
    phone: text(values.phone) || undefined,
    title: text(values.title) || undefined,
    department: text(values.department) || undefined,
    company: text(values.company) || undefined,
    linkedinUrl: text(values.linkedinUrl) || undefined,
    twitterUrl: text(values.twitterUrl) || undefined,
    websiteUrl: text(values.websiteUrl) || undefined,
    tags: tagsFrom(values.tags),
    leadId: numberOrUndefined(leadId),
    dealId: numberOrUndefined(dealId),
  };
}

function forUpdate(values: RecordFormValues, id: number): UpdateContactInput {
  return {
    id,
    name: text(values.name),
    email: text(values.email) || null,
    phone: text(values.phone) || null,
    title: text(values.title) || null,
    department: text(values.department) || null,
    company: text(values.company) || null,
    linkedinUrl: text(values.linkedinUrl) || null,
    twitterUrl: text(values.twitterUrl) || null,
    websiteUrl: text(values.websiteUrl) || null,
    tags: tagsFrom(values.tags),
  };
}

interface ContactLinkFieldsProps {
  leadId: string;
  dealId: string;
  onLeadChange: (value: string) => void;
  onDealChange: (value: string) => void;
}

/** Leads and deals are records, and the description has no kind that names one. */
function ContactLinkFields({
  leadId,
  dealId,
  onLeadChange,
  onDealChange,
}: ContactLinkFieldsProps) {
  const canViewLeads = useCan("crm:leads:view");
  const canReadDeals = useCan("crm:deals:read");
  const { data: leadsData } = useLeads(undefined, { enabled: canViewLeads });
  const { data: dealsData } = useDeals();

  const leadOptions = useMemo(
    () =>
      (leadsData?.leads ?? []).map((lead) => ({
        value: String(lead.id),
        label: lead.name,
        sublabel: lead.email ?? undefined,
      })),
    [leadsData],
  );

  const dealOptions = useMemo(
    () => (dealsData ?? []).map((deal) => ({ value: String(deal.id), label: deal.name })),
    [dealsData],
  );

  if (!canViewLeads && !canReadDeals) return null;

  return (
    <div className="flex flex-col gap-gap-toolbar">
      <h3 className="text-label font-medium text-muted-foreground">Linked records</h3>
      <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-2">
        {canViewLeads ? (
          <div className="flex min-w-0 flex-col gap-gap-field">
            <span className="text-label font-medium">Lead</span>
            <Combobox
              options={leadOptions}
              value={leadId}
              onChange={onLeadChange}
              placeholder="Link a lead"
              searchPlaceholder="Search by name or email"
              emptyText="No leads found"
            />
          </div>
        ) : null}
        {canReadDeals ? (
          <div className="flex min-w-0 flex-col gap-gap-field">
            <span className="text-label font-medium">Deal</span>
            <Combobox
              options={dealOptions}
              value={dealId}
              onChange={onDealChange}
              placeholder="Link a deal"
              searchPlaceholder="Search by name"
              emptyText="No deals found"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
}

export function ContactSheet({ open, onOpenChange, contact }: ContactSheetProps) {
  const layout = useTenantLayout(CONTACT_LAYOUT);
  const [leadId, setLeadId] = useState("");
  const [dealId, setDealId] = useState("");
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const isEditing = !!contact;
  const isPending = createContact.isPending || updateContact.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (contact) {
      updateContact.mutate(forUpdate(values, contact.id), {
        onSuccess: () => {
          toast.success("Contact updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    createContact.mutate(forCreate(values, leadId, dealId), {
      onSuccess: () => {
        toast.success("Contact created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit contact" : "New contact"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this person's details."
              : "A contact is a person you deal with at a company."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-gap-section px-6 py-5">
          {isEditing ? null : (
            <ContactLinkFields
              leadId={leadId}
              dealId={dealId}
              onLeadChange={setLeadId}
              onDealChange={setDealId}
            />
          )}

          <RecordForm
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={
              contact ? asRecordValue({ ...contact, tags: contact.tags.join(", ") }) : undefined
            }
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create contact"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
