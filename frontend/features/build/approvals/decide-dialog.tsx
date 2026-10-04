"use client";

import { useForm } from "react-hook-form";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApproval, useDecideApproval } from "@/hooks/api/build/approvals";
import { useCan } from "@/hooks/api/access";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorReference } from "@/components/shared/error-reference";
import { LoadingState } from "@/components/shared/loading-state";
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
import type { Approval } from "@/types/projects";
import { DECIDABLE } from "./approvals-constants";

interface DecideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  approvalId: number;
  revision?: number;
  onCloseAutoFocus?: () => void;
}

export function DecideDialog({
  open,
  onOpenChange,
  projectId,
  approvalId,
  revision,
  onCloseAutoFocus,
}: DecideDialogProps) {
  const canDecide = useCan("build:approvals:decide");
  const detail = useApproval(projectId, approvalId, open);
  const decide = useDecideApproval(projectId);
  const context = JSON.stringify([open, projectId, approvalId, detail.ownerStamp]);
  const committed = useRef<string | null>(null);
  const [review, setReview] = useState<{ context: string; approval: Approval | null; blocked: boolean; error: unknown }>({
    context, approval: detail.data ?? null, blocked: false, error: null,
  });
  const [latestRead, setLatestRead] = useState<{ context: string; pending: boolean }>({ context, pending: false });
  const reviewing = latestRead.context === context && latestRead.pending;
  if (review.context !== context) setReview({ context, approval: detail.data ?? null, blocked: false, error: null });
  else if (!review.approval && !review.blocked && !review.error && detail.data)
    setReview({ ...review, approval: detail.data });
  const denied = isApiError(review.error) && (review.error.status === 403 || review.error.status === 404);
  const visible = open && canDecide && detail.ownerStamp && detail.data && !detail.error && !denied && review.context === context ? review.approval : null;
  const isPending = decide.isPending || reviewing;
  const form = useForm<DecideApprovalValues>({
    resolver: zodResolver(decideApprovalSchema),
    defaultValues: { decision: "approved", decisionComment: "" },
  });
  useLayoutEffect(() => {
    committed.current = context;
    form.reset();
    return () => { committed.current = null; };
  }, [context, form]);

  async function handleSubmit(values: DecideApprovalValues) {
    if (!visible || !DECIDABLE.has(visible.status)
      || review.blocked || isPending || committed.current !== context) return;
    try {
      await decide.mutateAsync({ approvalId, expectedRevision: visible.revision,
        decision: values.decision, decisionComment: values.decisionComment || undefined });
      if (committed.current !== context) return;
      toast.success("Decision submitted");
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      if (committed.current === context) setReview({ ...review, blocked: isApiError(error) && error.status === 409, error });
    }
  }
  async function handleReviewLatest() {
    if (isPending || !detail.ownerStamp || !canDecide) return;
    setLatestRead({ context, pending: true });
    try {
      const result = await detail.refetch();
      if (committed.current !== context) return;
      if (result.error || !result.data) throw result.error ?? new Error("Approval is unavailable.");
      setReview({ context, approval: result.data, blocked: false, error: null });
    } catch (error: unknown) {
      if (committed.current === context) setReview({ ...review, blocked: true, error });
    } finally { if (committed.current === context) setLatestRead({ context, pending: false }); }
  }

  function handleOpenChange(open: boolean) {
    if (!open && isPending) return;
    if (!open) form.reset();
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus ? (event) => { event.preventDefault(); onCloseAutoFocus(); } : undefined}>
        <DialogHeader>
          <DialogTitle>Make Decision</DialogTitle>
          <DialogDescription className="text-label">
            {visible ? `${visible.title}` : "Review the current approval before submitting a decision."}
          </DialogDescription>
        </DialogHeader>
        {detail.isPending && !visible && <LoadingState variant="list" rows={2} />}
        {visible && <p className="text-xs text-muted-foreground">Revision {visible.revision}{revision !== undefined && visible.revision !== revision ? " · Updated since the queue was loaded" : ""} · {visible.status}</p>}
        {Boolean(detail.error || review.error) && <div role="alert" className="text-sm text-destructive">
          {getErrorMessage(detail.error || review.error)}
          <ErrorReference error={detail.error || review.error} />
        </div>}
        {(review.blocked || Boolean(detail.error)) && <LoadingButton type="button" variant="outline" size="sm" isPending={reviewing} onClick={handleReviewLatest}>Review latest</LoadingButton>}
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
              <LoadingButton type="submit" size="sm" disabled={!visible || review.blocked || !DECIDABLE.has(visible.status)} isPending={isPending} loadingText="Submitting…">
                Submit
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
