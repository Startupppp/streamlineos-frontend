"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateParty, useUpdateParty } from "@/hooks/api/accounting/parties";
import type { PartyDetail } from "@/types/accounting-ar";
import { PartyFormFields } from "./party-form-fields";
import {
  emptyPartyForm,
  partyFormFromDetail,
  partyFormSchema,
  toCreatePartyInput,
  toUpdatePartyInput,
  type PartyFormValues,
} from "./party-schema";

interface PartyFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  party?: PartyDetail;
  onCreated?: (party: PartyDetail) => void;
}

export function PartyFormSheet({ open, onOpenChange, party, onCreated }: PartyFormSheetProps) {
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();
  const isEdit = party !== undefined;

  const defaultValues = useMemo<PartyFormValues>(
    () => (party ? partyFormFromDetail(party) : emptyPartyForm),
    [party],
  );

  function handleSubmit(values: PartyFormValues): void {
    if (party) {
      updateParty.mutate(
        { partyId: party.id, input: toUpdatePartyInput(values) },
        {
          onSuccess: () => {
            toast.success("Customer updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createParty.mutate(toCreatePartyInput(values), {
      onSuccess: (created) => {
        toast.success("Customer added");
        onOpenChange(false);
        onCreated?.(created);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<PartyFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit customer" : "Add a customer"}
      description={
        isEdit
          ? "Changes apply to new invoices. Posted invoices keep the details they were issued with."
          : "Everything you need to bill them. You can fill in the rest later."
      }
      resolver={zodResolver(partyFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={createParty.isPending || updateParty.isPending}
      submitLabel={isEdit ? "Save changes" : "Add customer"}
      resetOnOpen
      className="sm:max-w-lg"
    >
      {(form) => <PartyFormFields form={form} />}
    </EntityFormSheet>
  );
}
