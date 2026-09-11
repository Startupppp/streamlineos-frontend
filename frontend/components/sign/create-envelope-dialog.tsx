"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSignEnvelope } from "@/hooks/api/sign/envelopes";
import { envelopeSchema, type EnvelopeValues } from "@/components/sign/envelope-schema";

interface CreateEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  sourceModule?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}

export function CreateEnvelopeDialog({
  open,
  onOpenChange,
  defaultTitle,
  sourceModule,
  sourceEntityType,
  sourceEntityId,
  dialogTitle,
  dialogDescription,
}: CreateEnvelopeDialogProps) {
  const router = useRouter();
  const createEnvelope = useCreateSignEnvelope();

  async function handleSubmit(values: EnvelopeValues) {
    try {
      const envelope = await createEnvelope.mutateAsync({
        title: values.title,
        message: values.message,
        sourceModule,
        sourceEntityType,
        sourceEntityId,
      });
      onOpenChange(false);
      router.push(`/sign/envelopes/${envelope.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <EntityFormSheet<EnvelopeValues>
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle ?? "New envelope"}
      description={dialogDescription ?? "Start with a title — you'll upload the document and add signers next."}
      resolver={zodResolver(envelopeSchema)}
      defaultValues={{ title: defaultTitle ?? "", message: "" }}
      onSubmit={handleSubmit}
      isSubmitting={createEnvelope.isPending}
      submitLabel="Create envelope"
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
