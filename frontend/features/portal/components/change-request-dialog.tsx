"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useSubmitChangeRequest } from "@/hooks/api/portal/use-submit-change-request";
import {
  changeRequestSchema,
  type ChangeRequestInput,
} from "@/features/portal/lib/change-request-schema";
import { getErrorMessage } from "@/lib/get-error-message";

interface ChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

export function ChangeRequestDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ChangeRequestDialogProps) {
  const mutation = useSubmitChangeRequest(projectId);

  const form = useForm<ChangeRequestInput>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleClose = useCallback(() => {
    if (mutation.isPending) return;
    form.reset();
    onOpenChange(false);
  }, [mutation.isPending, form, onOpenChange]);

  const handleSubmit = useCallback(
    (values: ChangeRequestInput) => {
      mutation.mutate(values, {
        onSuccess: () => {
          toast.success("Change request submitted successfully.");
          form.reset();
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
    },
    [mutation, form, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a change request</DialogTitle>
          <DialogDescription>
            Describe the change you need for{" "}
            <span className="font-medium text-foreground">{projectName}</span>.
            The project team will review and respond.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of the requested change"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide context, reasons, and any relevant details…"
                      className="min-h-[120px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={mutation.isPending} loadingText="Submitting…">
                Submit request
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
