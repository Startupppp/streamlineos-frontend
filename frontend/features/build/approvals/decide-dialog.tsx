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
import { SanitizedHtml } from "@/components/shared/sanitized-html";
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
import type { BuildApprovalsGetApprovalResponse } from "@/contracts/build-contracts.generated";
import { DECIDABLE } from "./approvals-constants";
const ARTIFACT_DESCRIPTION_POLICY = { config: {
  ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "blockquote", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "table", "thead", "tbody", "tr", "th", "td", "span", "div", "sup", "sub"],
  ALLOWED_ATTR: ["href", "title", "colspan", "rowspan", "start"], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
} };

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
  const [review, setReview] = useState<{ context: string; approval: BuildApprovalsGetApprovalResponse | null; blocked: boolean; error: unknown }>({
    context, approval: detail.data ?? null, blocked: false, error: null,
  });
  const [latestRead, setLatestRead] = useState<{ context: string; pending: boolean }>({ context, pending: false });
  const reviewing = latestRead.context === context && latestRead.pending;
  if (review.context !== context) setReview({ context, approval: detail.data ?? null, blocked: false, error: null });
  else if (!review.approval && !review.blocked && !review.error && detail.data)
    setReview({ ...review, approval: detail.data });
  const denied = isApiError(review.error) && (review.error.status === 403 || review.error.status === 404);
  const visible = open && canDecide && detail.ownerStamp && detail.data && !detail.error && !denied && review.context === context ? review.approval : null;
  const task = visible?.entityType === "task";
  const latestArtifact = visible ? detail.data?.artifact : undefined;
  const reviewedArtifact = visible?.artifact;
  const artifact = task && latestArtifact && (latestArtifact.state === "current" || latestArtifact.state === "stale")
    && reviewedArtifact && (reviewedArtifact.state === "current" || reviewedArtifact.state === "stale")
    && latestArtifact.digest === reviewedArtifact.digest && latestArtifact.requestedArtifactVersion === reviewedArtifact.requestedArtifactVersion
    ? reviewedArtifact : null;
  const artifactReady = !task || Boolean(artifact && latestArtifact?.state === "current"
    && latestArtifact.currentArtifactVersion === artifact.requestedArtifactVersion);
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
    if (!visible || !artifactReady || !DECIDABLE.has(visible.status)
      || review.blocked || isPending || committed.current !== context) return;
    try {
      await decide.mutateAsync({ approvalId, expectedRevision: visible.revision,
        decision: values.decision, decisionComment: values.decisionComment || undefined });
      if (committed.current !== context) return;
      toast.success("Decision submitted");
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      if (committed.current === context) setReview((prev) => ({ ...prev, blocked: isApiError(error) && error.status === 409, error }));
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
      if (committed.current === context) setReview((prev) => ({ ...prev, blocked: true, error }));
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
        {task && artifact && <section aria-label="Requested ticket artifact" className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
          <h3 className="font-semibold">{artifact.snapshot.title}</h3>
          <p>Ticket version {artifact.requestedArtifactVersion} · Current version {latestArtifact && "currentArtifactVersion" in latestArtifact ? latestArtifact.currentArtifactVersion : "unavailable"}</p>
          <p className="text-xs text-muted-foreground">Captured {artifact.capturedAt}</p>
          <dl className="grid grid-cols-2 gap-1">
            <dt>Ticket</dt><dd>{artifact.snapshot.ticketNumber}</dd>
            <dt>Type</dt><dd>{artifact.snapshot.type}</dd><dt>Status</dt><dd>{artifact.snapshot.status}</dd>
            <dt>Priority</dt><dd>{artifact.snapshot.priority ?? "—"}</dd><dt>Points</dt><dd>{artifact.snapshot.points ?? "—"}</dd>
            <dt>Original estimate</dt><dd>{artifact.snapshot.originalEstimate ?? "—"}</dd>
            <dt>Start date</dt><dd>{artifact.snapshot.startDate ?? "—"}</dd><dt>Due date</dt><dd>{artifact.snapshot.dueDate ?? "—"}</dd>
          </dl>
          {artifact.snapshot.description && <SanitizedHtml key={artifact.digest} html={artifact.snapshot.description} policy={ARTIFACT_DESCRIPTION_POLICY} className="whitespace-pre-wrap break-words" />}
        </section>}
        {task && !artifactReady && <p role="status" className="text-sm text-muted-foreground">{latestArtifact?.state === "stale"
          ? "The ticket changed after this request. Request approval for its current version."
          : latestArtifact?.state === "restricted" ? "Ticket content access is required to review and decide this request."
            : latestArtifact?.state === "unavailable" ? "The requested ticket is unavailable."
              : latestArtifact?.state === "unbound" ? "This request has no captured ticket version. Create a new bound request."
                : "The requested artifact changed. Review latest before deciding."}</p>}
        {(detail.error != null || review.error != null) && <div role="alert" className="text-sm text-destructive">
          {getErrorMessage(detail.error ?? review.error)}
          <ErrorReference error={detail.error ?? review.error} />
        </div>}
        {(review.blocked || Boolean(detail.error) || (task && !artifactReady)) && <LoadingButton type="button" variant="outline" size="sm" isPending={reviewing} onClick={handleReviewLatest}>Review latest</LoadingButton>}
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
              <LoadingButton type="submit" size="sm" disabled={!visible || !artifactReady || review.blocked || !DECIDABLE.has(visible.status)} isPending={isPending} loadingText="Submitting…">
                Submit
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
