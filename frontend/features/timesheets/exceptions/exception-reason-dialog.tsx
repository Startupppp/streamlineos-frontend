"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  EXCEPTION_RULE_LABEL,
  type TimesheetException,
} from "@/features/timesheets/types";
import {
  exceptionReasonSchema,
  type ExceptionReasonValues,
} from "./exceptions-schema";

export type ExceptionAction = "resolve" | "dismiss";

const ACTION_COPY: Record<
  ExceptionAction,
  { title: string; description: string; cta: string; pending: string }
> = {
  resolve: {
    title: "Resolve exception",
    description: "Mark this exception as resolved with a short explanation.",
    cta: "Resolve",
    pending: "Resolving…",
  },
  dismiss: {
    title: "Dismiss exception",
    description:
      "Dismiss this exception if it doesn't require any action.",
    cta: "Dismiss",
    pending: "Dismissing…",
  },
};

interface ExceptionReasonDialogProps {
  open: boolean;
  action: ExceptionAction;
  exception: TimesheetException | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export function ExceptionReasonDialog({
  open,
  action,
  exception,
  onOpenChange,
  onConfirm,
  isPending,
}: ExceptionReasonDialogProps) {
  const copy = ACTION_COPY[action];

  const form = useForm<ExceptionReasonValues>({
    resolver: zodResolver(exceptionReasonSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onConfirm(values.reason);
  });

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {exception && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium">
              {EXCEPTION_RULE_LABEL[exception.rule]}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {exception.message}
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={
                        action === "resolve"
                          ? "How was this addressed?"
                          : "Why is no action needed?"
                      }
                      className="text-xs resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={isPending}
                loadingText={copy.pending}
                variant={action === "dismiss" ? "destructive" : "default"}
              >
                {copy.cta}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
