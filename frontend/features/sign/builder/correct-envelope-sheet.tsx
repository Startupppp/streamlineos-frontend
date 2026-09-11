"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCorrectSignEnvelope, type CorrectSignEnvelopeInput } from "@/hooks/api/sign/envelopes";
import type { SignRecipient } from "@/types/sign";
import { correctEnvelopeSchema, type CorrectEnvelopeValues } from "./correct-envelope-schema";

interface CorrectEnvelopeSheetProps {
  envelopeId: number;
  recipients: SignRecipient[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormRecipient(recipient: SignRecipient) {
  return {
    id: recipient.id,
    name: recipient.name,
    email: recipient.email ?? "",
    phone: recipient.phone ?? "",
  };
}

export function CorrectEnvelopeSheet({ envelopeId, recipients, open, onOpenChange }: CorrectEnvelopeSheetProps) {
  const correct = useCorrectSignEnvelope(envelopeId);
  const neutral = statusToneClasses("neutral");

  const correctable = recipients.filter((recipient) => recipient.status !== "completed");
  const locked = recipients.filter((recipient) => recipient.status === "completed");

  function handleSubmit(values: CorrectEnvelopeValues) {
    const changed = values.recipients.filter((row) => {
      const original = correctable.find((recipient) => recipient.id === row.id);
      if (!original) return false;
      return (
        row.name !== original.name ||
        row.email !== (original.email ?? "") ||
        row.phone !== (original.phone ?? "")
      );
    });

    const payload: CorrectSignEnvelopeInput = {
      reason: values.reason || undefined,
      recipients: changed.length
        ? changed.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email || undefined,
            phone: row.phone || undefined,
          }))
        : undefined,
    };

    correct.mutate(payload, {
      onSuccess: () => {
        toast.success(changed.length ? "Envelope corrected" : "Correction recorded");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<CorrectEnvelopeValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Correct this envelope"
      description="Fix a recipient's details on an envelope that has already gone out. Their signing link keeps working."
      resolver={zodResolver(correctEnvelopeSchema)}
      defaultValues={{ reason: "", recipients: correctable.map(toFormRecipient) }}
      onSubmit={handleSubmit}
      isSubmitting={correct.isPending}
      submitLabel="Apply correction"
      className="sm:max-w-lg"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="e.g. Signer's email address was misspelled" {...field} />
                </FormControl>
                <FormDescription>Written to the envelope&apos;s audit trail alongside the change.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {correctable.length === 0 ? (
            <p className={cn("rounded-md border p-3 text-sm", neutral.surface, neutral.rule, neutral.ink)}>
              Every recipient on this envelope has already completed, so there is nothing left to correct. A completed
              recipient cannot be modified.
            </p>
          ) : (
            <div className="space-y-4">
              {correctable.map((recipient, index) => (
                <div key={recipient.id} className="rounded-xl border border-border/70 p-4 space-y-3">
                  <p className="text-sm font-semibold">{recipient.roleName}</p>
                  <FormField
                    control={form.control}
                    name={`recipients.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`recipients.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`recipients.${index}.phone`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="IN"
                            placeholder="Enter phone number"
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? "")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {locked.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Already completed</h3>
              <ul className={cn("rounded-md border p-3 text-sm space-y-1", neutral.surface, neutral.rule, neutral.ink)}>
                {locked.map((recipient) => (
                  <li key={recipient.id} className="break-words">
                    {recipient.name}
                    {recipient.email ? ` (${recipient.email})` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                A completed recipient cannot be modified — their signature is already bound to the details they signed
                under.
              </p>
            </section>
          )}
        </div>
      )}
    </EntityFormSheet>
  );
}
