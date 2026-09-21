"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateSignEnvelope } from "@/hooks/api/sign/envelopes";
import type { SignEnvelope } from "@/types/sign";
import { envelopeSchema, type EnvelopeValues } from "@/components/sign/envelope-schema";

interface EditEnvelopeSheetProps {
  envelope: SignEnvelope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEnvelopeSheet({ envelope, open, onOpenChange }: EditEnvelopeSheetProps) {
  const updateEnvelope = useUpdateSignEnvelope(envelope.id);

  async function handleSubmit(values: EnvelopeValues) {
    try {
      await updateEnvelope.mutateAsync({
        title: values.title,
        message: values.message || undefined,
      });
      toast.success("Envelope updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormSheet<EnvelopeValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Edit envelope"
      description="Update the title or message for this draft envelope."
      resolver={zodResolver(envelopeSchema)}
      defaultValues={{
        title: envelope.title,
        message: envelope.message ?? "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateEnvelope.isPending}
      submitLabel="Save changes"
      className="sm:max-w-md"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Title <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Vendor Agreement — Acme Corp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message to signers (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="A short note included in the signing email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}
