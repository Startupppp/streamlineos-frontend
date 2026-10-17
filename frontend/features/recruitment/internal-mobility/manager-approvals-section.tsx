"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDecideInternalApproval,
  useInternalApprovals,
  type InternalApproval,
} from "@/hooks/api/hr/recruitment/internal-mobility";

interface ApprovalRowProps {
  approval: InternalApproval;
}

function ApprovalRow({ approval }: ApprovalRowProps) {
  const [note, setNote] = useState("");
  const mutation = useDecideInternalApproval();

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  }, []);

  const decide = useCallback(
    (decision: "APPROVED" | "DECLINED") => {
      mutation.mutate(
        { applicationId: approval.applicationId, decision, note: note.trim() || undefined },
        {
          onSuccess: () =>
            toast.success(decision === "APPROVED" ? "Approved." : "Declined."),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [approval.applicationId, mutation, note],
  );

  const handleApprove = useCallback(() => { decide("APPROVED"); }, [decide]);
  const handleDecline = useCallback(() => { decide("DECLINED"); }, [decide]);

  const noteId = `internal-approval-note-${approval.applicationId}`;

  return (
    <div className="rounded-lg border px-3 py-3 space-y-3">
      <div>
        <p className="text-sm font-medium">
          {approval.candidateFirstName} {approval.candidateLastName} — {approval.jobTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          Applied {format(new Date(approval.appliedAt), "MMM d, yyyy")}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={noteId} className="text-xs">
          Note for HR (optional)
        </Label>
        <Textarea
          id={noteId}
          value={note}
          onChange={handleNoteChange}
          rows={2}
          placeholder="Anything the hiring team should know."
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <LoadingButton
          size="sm"
          onClick={handleApprove}
          isPending={mutation.isPending}
          loadingText="Saving..."
        >
          Approve the move
        </LoadingButton>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={mutation.isPending}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

/**
 * The decisions waiting on the viewer as somebody's manager.
 *
 * Renders nothing at all when the queue is empty, which for most people is
 * always — this section sits on a page everyone in the organisation can open,
 * and an empty "Approvals" card on it would suggest a job they do not have.
 *
 * The note the manager writes goes to HR and to the recruiter. It is never
 * shown to the applicant, and nothing on this screen implies otherwise.
 */
export function ManagerApprovalsSection() {
  const { data: approvals = [], isLoading, isError } = useInternalApprovals();

  if (isError) return null;
  if (isLoading) return <Skeleton className="h-20 rounded-xl" />;
  if (approvals.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Internal moves waiting on you
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Someone who reports into your team has reached the interview stage for another role.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {approvals.map((approval) => (
          <ApprovalRow key={approval.applicationId} approval={approval} />
        ))}
      </CardContent>
    </Card>
  );
}
