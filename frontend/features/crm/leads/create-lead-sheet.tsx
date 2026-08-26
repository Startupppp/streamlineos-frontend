"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, type RecordFormValues } from "@/features/renderer";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { useCreateLead } from "@/hooks/api/leads";
import { getErrorMessage } from "@/lib/get-error-message";
import { LEAD_LAYOUT } from "@/lib/renderer/crm/lead-layout";
import type { CreateLeadInput, LeadPriority, LeadSource } from "@/types/leads";

/**
 * Adding a lead, rendered from the description.
 *
 * There is no schema beside this file any more. The one that used to live here
 * listed eleven of the fifteen fields the create endpoint accepts and validated
 * them a second time; the four it never gained — WhatsApp number, designation,
 * and the two the record has always carried — simply could not be entered.
 *
 * `status` and `score` do not appear, and not because this file omits them: the
 * description marks them read-only because the create endpoint does not take
 * them. A control whose value the API drops is a form that appears to work.
 */

const SOURCES: readonly LeadSource[] = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
];

const PRIORITIES: readonly LeadPriority[] = ["HOT", "WARM", "COLD"];

/** Empty means "not supplied", which the create endpoint reads as absent. */
function orUndefined(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function toSource(value: string | undefined): LeadSource | undefined {
  return SOURCES.find((candidate) => candidate === value);
}

function toPriority(value: string | undefined): LeadPriority | undefined {
  return PRIORITIES.find((candidate) => candidate === value);
}

interface CreateLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadSheet({ open, onOpenChange }: CreateLeadSheetProps) {
  const layout = useTenantLayout(LEAD_LAYOUT);
  const createLead = useCreateLead();

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    const input: CreateLeadInput = {
      name: values.name?.trim() ?? "",
      email: orUndefined(values.email),
      phone: orUndefined(values.phone),
      whatsappNumber: orUndefined(values.whatsappNumber),
      company: orUndefined(values.company),
      designation: orUndefined(values.designation),
      city: orUndefined(values.city),
      source: toSource(values.source),
      priority: toPriority(values.priority),
      referredBy: orUndefined(values.referredBy),
      potentialValue: orUndefined(values.potentialValue),
      investmentInterest: orUndefined(values.investmentInterest),
      notes: orUndefined(values.notes),
    };

    createLead.mutate(input, {
      onSuccess: () => {
        toast.success("Lead created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>New lead</SheetTitle>
          <SheetDescription>
            A lead is a person or company you are selling to, before there is anything to invoice.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            // Remounted per open so a cancelled draft does not survive into the
            // next lead.
            key={String(open)}
            layout={layout}
            mode="create"
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={createLead.isPending}
            submitLabel="Create lead"
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
