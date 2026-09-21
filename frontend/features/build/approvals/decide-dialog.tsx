"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { decideApprovalSchema, type DecideApprovalValues } from "./approvals-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { DecideApprovalInput } from "@/types/projects";

interface DecideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: DecideApprovalInput) => void;
  isPending?: boolean;
  approvalTitle?: string;
}

export function DecideDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  approvalTitle,
}: DecideDialogProps) {
  const form = useForm<DecideApprovalValues>({
    resolver: zodResolver(decideApprovalSchema),
    defaultValues: { decision: "approved", decisionComment: "" },
  });

  function handleSubmit(values: DecideApprovalValues) {
    onConfirm({
      decision: values.decision,
      decisionComment: values.decisionComment || undefined,
    });
  }

  function handleOpenChange(open: boolean) {
    if (!open) form.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Decision</DialogTitle>
          {approvalTitle && (
            <DialogDescription className="text-label">{approvalTitle}</DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                      <SelectItem value="changes_requested">Request Changes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="decisionComment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add a comment…"
                      rows={3}
                      className="resize-none text-sm"
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
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Submitting…">
                Submit
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
