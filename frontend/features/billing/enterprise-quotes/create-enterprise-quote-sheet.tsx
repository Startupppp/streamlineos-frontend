"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { useCreateEnterpriseQuote, type CreateEnterpriseQuotePayload } from "@/hooks/api/billing/enterprise-quotes";
import { getErrorMessage } from "@/lib/get-error-message";
import { createEnterpriseQuoteSchema, type CreateEnterpriseQuoteForm } from "./enterprise-quote-schema";
import { EnterpriseQuoteFormFields } from "./enterprise-quote-form-fields";

const DEFAULTS: CreateEnterpriseQuoteForm = {
  subject: "",
  requestedSeats: "",
  negotiatedSeats: "",
  pricePerSeat: "",
  contractTermMonths: "12",
  validUntil: "",
  notes: "",
};

interface CreateEnterpriseQuoteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEnterpriseQuoteSheet({ open, onOpenChange }: CreateEnterpriseQuoteSheetProps) {
  const create = useCreateEnterpriseQuote();

  function handleSubmit(payload: CreateEnterpriseQuotePayload) {
    create.mutate(payload, {
      onSuccess: (created) => {
        toast.success(`Quote ${created.quoteRef} created as a draft`);
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<CreateEnterpriseQuoteForm, CreateEnterpriseQuotePayload>
      open={open}
      onOpenChange={onOpenChange}
      title="New enterprise quote"
      description="A new quote starts as a draft; submit it for approval from the list."
      resolver={zodResolver(createEnterpriseQuoteSchema)}
      defaultValues={DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={create.isPending}
      submitLabel="Create draft"
      resetOnOpen
    >
      {(form) => <EnterpriseQuoteFormFields form={form} />}
    </EntityFormSheet>
  );
}
