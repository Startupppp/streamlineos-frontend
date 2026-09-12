"use client";

import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateNurtureSequence } from "@/hooks/api/crm/nurture";
import {
  nurtureSequenceSchema,
  toCreateSequenceInput,
  type NurtureSequenceFormValues,
} from "./nurture-sequence-schema";

interface CreateNurtureSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (nurtureSequenceId: string) => void;
}

const DEFAULTS: NurtureSequenceFormValues = { name: "", description: "" };

/**
 * Two fields, so a Dialog rather than a Sheet.
 *
 * A sequence is born `draft` with no steps and no way to enrol anybody, which
 * is why naming it is all this asks for: the cadence is the next screen's work,
 * and a create form that also collected steps would let somebody author a
 * twelve-touch sequence in one go without ever seeing what it will actually run.
 */
export function CreateNurtureSequenceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateNurtureSequenceDialogProps) {
  const createSequence = useCreateNurtureSequence();

  const handleSubmit = (values: NurtureSequenceFormValues) => {
    createSequence.mutate(toCreateSequenceInput(values), {
      onSuccess: (created) => {
        toast.success("Sequence created");
        onOpenChange(false);
        onCreated(created.nurtureSequenceId);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <EntityFormDialog<NurtureSequenceFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="New nurture sequence"
      description="Name it now; add the cadence next. Nothing sends until it has steps and you turn it on."
      resolver={zodResolver(nurtureSequenceSchema)}
      defaultValues={DEFAULTS}
      onSubmit={handleSubmit}
      isSubmitting={createSequence.isPending}
      submitLabel="Create sequence"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Post-demo follow-up" autoComplete="off" />
                </FormControl>
                <FormDescription>
                  One name per organisation. Two sequences called the same thing is how somebody
                  enrols a customer in the wrong one.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What it is for</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Who belongs in this cadence, and why."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
