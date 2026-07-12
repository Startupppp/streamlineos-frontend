"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateSignEnvelope } from "@/hooks/api/sign/envelopes";

const createEnvelopeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  message: z.string().trim().max(2000).optional(),
});
type CreateEnvelopeValues = z.infer<typeof createEnvelopeSchema>;

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

  async function handleSubmit(values: CreateEnvelopeValues) {
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
    <EntityFormDialog<CreateEnvelopeValues>
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle ?? "New envelope"}
      description={dialogDescription ?? "Start with a title — you'll upload the document and add signers next."}
      resolver={zodResolver(createEnvelopeSchema)}
      defaultValues={{ title: defaultTitle ?? "", message: "" }}
      onSubmit={handleSubmit}
      isSubmitting={createEnvelope.isPending}
      submitLabel="Create envelope"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
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
    </EntityFormDialog>
  );
}
