"use client";

import { useState } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useParties } from "@/hooks/api/party/parties";
import { useDeals } from "@/hooks/api/crm/deals";
import { useEnrolInNurtureSequence } from "@/hooks/api/crm/nurture";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  enrolInNurtureSchema,
  toEnrolInput,
  type EnrolInNurtureFormValues,
} from "./enrol-in-nurture-schema";

interface EnrolInNurtureDialogProps {
  nurtureSequenceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULTS: EnrolInNurtureFormValues = { partyId: "", dealId: "" };

/**
 * Putting one customer into a cadence.
 *
 * The deal is optional on the wire and all but required in practice: it carries
 * the salesperson to write as and the conversation to write from, so an
 * enrolment without one produces steps that refuse before they draft. Said in
 * the field's own description rather than enforced, because the server accepts
 * it and a client that refused would be a second, stricter contract.
 */
export function EnrolInNurtureDialog({
  nurtureSequenceId,
  open,
  onOpenChange,
}: EnrolInNurtureDialogProps) {
  const [partySearch, setPartySearch] = useState("");
  const debouncedPartySearch = useDebouncedValue(partySearch, 300);

  const parties = useParties({
    limit: 20,
    ...(debouncedPartySearch ? { search: debouncedPartySearch } : {}),
  });
  const deals = useDeals({ limit: 100 });
  const enrol = useEnrolInNurtureSequence();

  const partyOptions: ComboboxOption[] = (parties.data?.data ?? []).map((party) => ({
    value: party.partyId,
    label: party.name,
    ...(party.legalName ? { sublabel: party.legalName } : {}),
  }));

  const handleSubmit = (values: EnrolInNurtureFormValues) => {
    enrol.mutate(
      { nurtureSequenceId, ...toEnrolInput(values) },
      {
        onSuccess: () => {
          toast.success("Enrolled in the sequence");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <EntityFormDialog<EnrolInNurtureFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Enrol a customer"
      description="One live enrolment per customer across every sequence, so nothing talks over anything else."
      resolver={zodResolver(enrolInNurtureSchema)}
      defaultValues={DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={enrol.isPending}
      submitLabel="Enrol"
      resetOnOpen
    >
      {(form) => {
        const partyId = form.watch("partyId");
        const dealOptions: ComboboxOption[] = (deals.data ?? [])
          .filter((deal) => deal.partyId !== null && deal.partyId === partyId)
          .map((deal) => ({ value: String(deal.id), label: deal.name, sublabel: deal.stage }));

        return (
          <>
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Combobox
                      options={partyOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Choose a customer…"
                      searchPlaceholder="Search customers…"
                      emptyText="No customers found."
                      onSearchChange={setPartySearch}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal</FormLabel>
                  <FormControl>
                    <Combobox
                      options={dealOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={partyId ? "Choose a deal…" : "Choose a customer first"}
                      searchPlaceholder="Search deals…"
                      emptyText="No open deals for this customer."
                      disabled={!partyId}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value
                      ? "Every message is written from this deal’s conversation."
                      : "Without a deal there is nothing for the drafter to write from, and each step will refuse before it drafts."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      }}
    </EntityFormDialog>
  );
}
