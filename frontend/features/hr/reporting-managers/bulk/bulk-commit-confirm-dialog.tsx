"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ConfirmationPhraseInput } from "@/components/hr/reporting-lines/confirmation-phrase-input";
import {
  createConfirmationPhraseSchema,
  type ConfirmationPhraseValues,
} from "@/components/hr/reporting-lines/confirmation-phrase-schema";

interface BulkCommitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The server-issued phrase (`BulkJob.confirmationPhrase`), e.g. "CONFIRM 12". */
  phrase: string;
  affected: number;
  isPending: boolean;
  onConfirm: () => void;
}

/**
 * PRD §7.6.3: a change to 10+ employees needs the phrase typed back. The dialog's
 * own confirm button cannot be disabled, so it is hidden and the commit button
 * lives in the phrase form, enabled only once the phrase matches.
 */
export function BulkCommitConfirmDialog({ open, onOpenChange, phrase, affected, isPending, onConfirm }: BulkCommitConfirmDialogProps) {
  const form = useForm<ConfirmationPhraseValues>({
    resolver: zodResolver(createConfirmationPhraseSchema(phrase)),
    defaultValues: { confirmationPhrase: "" },
    mode: "onChange",
  });
  const matches = form.watch("confirmationPhrase").trim() === phrase;

  function handleOpenChange(next: boolean) {
    if (!next) form.reset({ confirmationPhrase: "" });
    onOpenChange(next);
  }

  function handleValid() {
    onConfirm();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Change the reporting line of ${affected} employees?`}
      description="Each employee gets an effective-dated change and an audit record. In-flight approvals keep their current approver."
      hideConfirm
      isPending={isPending}
      onConfirm={handleValid}
      content={
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValid)} className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="confirmationPhrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation</FormLabel>
                  <FormControl>
                    <ConfirmationPhraseInput phrase={phrase} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton type="submit" isPending={isPending} disabled={!matches} className="self-end">
              Commit {affected} changes
            </LoadingButton>
          </form>
        </Form>
      }
    />
  );
}
