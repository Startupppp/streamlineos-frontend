"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDismissHealthItem } from "@/hooks/api/kb/content-health";
import type { ContentHealthSignalType } from "@/hooks/api/kb/content-health-schema";

const dismissSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(1000),
  dismissalExpiresAt: z.string().optional(),
});

type DismissFormValues = z.infer<typeof dismissSchema>;

interface ContentHealthDismissDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: number;
  pageTitle: string;
  kind: ContentHealthSignalType;
}

export function ContentHealthDismissDialog({
  open,
  onOpenChange,
  pageId,
  pageTitle,
  kind,
}: ContentHealthDismissDialogProps) {
  const dismiss = useDismissHealthItem();
  const form = useForm<DismissFormValues>({
    resolver: zodResolver(dismissSchema),
    defaultValues: { reason: "", dismissalExpiresAt: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(values: DismissFormValues) {
    try {
      await dismiss.mutateAsync({
        pageId,
        kind,
        reason: values.reason,
        dismissalExpiresAt: values.dismissalExpiresAt || undefined,
      });
      toast.success("Signal dismissed");
      handleOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dismiss signal</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dismissing the <span className="font-medium">{kind.replace(/_/g, " ")}</span> signal for{" "}
          <span className="font-medium">{pageTitle}</span>.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Why is this signal being dismissed?"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dismissalExpiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Snooze until{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional — leave blank for permanent)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="datetime-local" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={dismiss.isPending}>
                Dismiss
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function useDismissDialog() {
  const [state, setState] = useState<{
    open: boolean;
    pageId: number;
    pageTitle: string;
    kind: ContentHealthSignalType;
  } | null>(null);

  function openDismiss(pageId: number, pageTitle: string, kind: ContentHealthSignalType) {
    setState({ open: true, pageId, pageTitle, kind });
  }

  function closeDialog() {
    setState((s) => (s ? { ...s, open: false } : null));
  }

  return { state, openDismiss, closeDialog };
}
