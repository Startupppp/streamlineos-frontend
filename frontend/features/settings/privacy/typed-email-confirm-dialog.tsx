"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { erasureConfirmSchema, type ErasureConfirmValues } from "./erasure-confirm-schema";

interface TypedEmailConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  email: string;
  confirmLabel: string;
  isPending: boolean;
  withReason?: boolean;
  onConfirm: (values: ErasureConfirmValues) => void;
}

/**
 * The confirm for an irreversible erasure. The button stays shut until the operator
 * types the subject's email, so a mis-picked person cannot be erased by a reflex click.
 */
export function TypedEmailConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  email,
  confirmLabel,
  isPending,
  withReason = false,
  onConfirm,
}: TypedEmailConfirmDialogProps) {
  const schema = useMemo(() => erasureConfirmSchema(email, withReason), [email, withReason]);
  const form = useForm<ErasureConfirmValues>({
    resolver: zodResolver(schema),
    defaultValues: { confirmEmail: "", reason: "" },
    mode: "onChange",
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleConfirm() {
    void form.handleSubmit(onConfirm)();
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      destructive
      keepOpenOnConfirm
      isPending={isPending}
      confirmDisabled={!form.formState.isValid}
      confirmLabel={confirmLabel}
      onConfirm={handleConfirm}
      content={
        <Form {...form}>
          <div className="flex flex-col gap-3">
            {withReason ? (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea rows={3} maxLength={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="confirmEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type <span className="font-mono font-semibold">{email}</span> to confirm
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="off" spellCheck={false} className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      }
    />
  );
}
