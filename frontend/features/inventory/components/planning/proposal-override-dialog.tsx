"use client";

import { memo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProposalOverrideInput } from "@/hooks/api/inventory/replenishment-planning";
import { formatQuantity } from "./forecast-format";
import {
  proposalOverrideSchema,
  type ProposalOverrideFormValues,
} from "./proposal-override-schema";

export interface OverridableProposal {
  proposalId: number;
  productName: string;
  variantSku: string;
  /** The engine's own number for this proposal, as an exact decimal string. */
  engineQuantity: string;
}

interface ProposalOverrideDialogProps {
  proposal: OverridableProposal | null;
  existing: ProposalOverrideInput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (override: ProposalOverrideInput) => void;
}

/**
 * C2 — overruling the engine is a form, not an editable cell.
 *
 * Two fields, no context needed, so it is rung 3 of the overlay ladder rather
 * than an inline editor. That is not only the ladder: an inline number box is
 * exactly the shape that made the old screen post whatever the browser
 * computed. Changing the quantity here costs a sentence saying why, and the
 * engine's own figure stays on screen beside the field being typed into.
 */
export const ProposalOverrideDialog = memo(function ProposalOverrideDialog({
  proposal,
  existing,
  open,
  onOpenChange,
  onSave,
}: ProposalOverrideDialogProps) {
  function handleSubmit(values: ProposalOverrideFormValues): void {
    if (!proposal) return;
    onSave({
      proposalId: proposal.proposalId,
      quantity: values.quantity,
      reason: values.reason,
    });
    onOpenChange(false);
  }

  return (
    <EntityFormDialog<ProposalOverrideFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Override the engine's quantity"
      description={
        proposal
          ? `${proposal.productName} · ${proposal.variantSku}`
          : "Choose a proposal to override"
      }
      resolver={zodResolver(proposalOverrideSchema)}
      defaultValues={{
        quantity: existing?.quantity ?? proposal?.engineQuantity ?? "",
        reason: existing?.reason ?? "",
      }}
      onSubmit={handleSubmit}
      submitLabel={existing ? "Update override" : "Record override"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity to order</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    autoComplete="off"
                    className="font-mono tabular-nums"
                  />
                </FormControl>
                <FormDescription>
                  The engine proposes{" "}
                  <span className="font-mono tabular-nums">
                    {proposal ? formatQuantity(proposal.engineQuantity) : "—"}
                  </span>
                  . The supplier&rsquo;s minimum and pack size are applied to your number
                  too, so what is ordered may round up.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Why</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="What do you know that the demand history does not?"
                  />
                </FormControl>
                <FormDescription>
                  Recorded against the purchase order, so the reason survives longer than
                  the conversation.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
});
