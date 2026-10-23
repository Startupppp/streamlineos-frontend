"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TrustBadge } from "@/features/wiki/components/kb-collection-badges";
import { useCan } from "@/hooks/api/access";
import { useApprovePageReview, useCreatePageReview, useRejectPageReview } from "@/hooks/api/kb/page-reviews";
import type { KbPageReview, KbReviewType } from "@/hooks/api/kb/page-reviews";

interface RequestReviewDialogProps {
  pageId: number;
  pageTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestReviewDialog({ pageId, pageTitle, open, onOpenChange }: RequestReviewDialogProps) {
  const [type, setType] = useState<KbReviewType>("approval");
  const [reviewerId, setReviewerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const canManage = useCan("kb:reviews:manage");
  const createReview = useCreatePageReview();

  function handleTypeChange(value: string) {
    setType(value === "freshness" ? "freshness" : "approval");
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
  }

  function handleNoteChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(event.target.value);
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!canManage || !reviewerId || createReview.isPending) return;
    createReview.mutate(
      {
        pageId,
        type,
        reviewerId,
        dueAt: dueDate ? `${dueDate}T23:59:59.999Z` : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Review requested");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request review</DialogTitle>
          <DialogDescription>Assign a reviewer for {pageTitle}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-request-type">Review type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="review-request-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approval">Approval</SelectItem>
                <SelectItem value="freshness">Freshness</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-request-reviewer">Reviewer</Label>
            <UserCombobox
              id="review-request-reviewer"
              value={reviewerId}
              onChange={setReviewerId}
              placeholder="Select reviewer…"
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-request-due">Due date (optional)</Label>
            <DatePicker
              id="review-request-due"
              value={dueDate}
              onChange={handleDueDateChange}
              placeholder="Pick a date"
              dateFormat="dd MMM yyyy"
              clearable
              ariaLabel="Due date"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-request-note">Note (optional)</Label>
            <Textarea
              id="review-request-note"
              value={note}
              onChange={handleNoteChange}
              maxLength={2000}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <LoadingButton
            type="button"
            isPending={createReview.isPending}
            disabled={!canManage || !reviewerId}
            onClick={handleSubmit}
          >
            Request review
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ApproveDialogProps {
  review: KbPageReview;
  onClose: () => void;
}

export function ApproveDialog({ review, onClose }: ApproveDialogProps) {
  const [note, setNote] = useState("");
  const approve = useApprovePageReview();

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleApprove() {
    approve.mutate(
      { reviewId: review.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Review approved");
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve review</DialogTitle>
          <DialogDescription>
            Approving marks this file as reviewed. You can leave an optional
            note for the requester.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <TruncatedText
            text={review.pageTitle ?? ""}
            lines={2}
            className="text-sm text-muted-foreground"
          />
          {review.pageTrustState && <TrustBadge trustState={review.pageTrustState} />}
          <div className="space-y-1.5">
            <Label htmlFor="approve-review-note" className="text-xs">Note (optional)</Label>
            <Textarea
              id="approve-review-note"
              value={note}
              onChange={handleNoteChange}
              maxLength={2000}
              placeholder="Add a note…"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            isPending={approve.isPending}
            onClick={handleApprove}
            className="bg-status-success-fill hover:bg-status-success-fill-hover text-white"
          >
            Approve
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface RejectDialogProps {
  review: KbPageReview;
  onClose: () => void;
}

export function RejectDialog({ review, onClose }: RejectDialogProps) {
  const [note, setNote] = useState("");
  const reject = useRejectPageReview();

  function handleNoteChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
  }

  function handleReject() {
    if (!note.trim()) return;
    reject.mutate(
      { reviewId: review.id, note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Review rejected");
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject review</DialogTitle>
          <DialogDescription>
            Rejecting sends this file back to its author. Explain what needs to
            change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-0 py-2">
          <TruncatedText
            text={review.pageTitle ?? ""}
            lines={2}
            className="text-sm text-muted-foreground"
          />
          {review.pageTrustState && <TrustBadge trustState={review.pageTrustState} />}
          <div className="space-y-1.5">
            <Label htmlFor="reject-review-reason" className="text-xs">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-review-reason"
              value={note}
              onChange={handleNoteChange}
              maxLength={2000}
              required
              placeholder="Explain why this review is rejected…"
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            variant="destructive"
            isPending={reject.isPending}
            disabled={!note.trim()}
            onClick={handleReject}
          >
            Reject
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
