"use client";

import { useState } from "react";
import { CheckCircle2, CircleX, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarMeetingWorkspace } from "@/hooks/api/calendar-meeting-workspace-schema";
import {
  useAddCalendarMeetingDraft,
  useReviewCalendarMeetingDraft,
} from "@/hooks/api/calendar-meeting-workspace";
import { useConfirmCalendarSourceActionProposal } from "@/hooks/api/calendar-source-actions";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function MeetingWorkspaceOutcomes({
  workspace,
  onRefresh,
}: {
  workspace: CalendarMeetingWorkspace;
  onRefresh: () => void;
}) {
  const [kind, setKind] = useState<"DECISION" | "FOLLOW_UP" | "ACTION">(
    "ACTION",
  );
  const [content, setContent] = useState("");
  const [share, setShare] = useState(false);
  const add = useAddCalendarMeetingDraft();
  const review = useReviewCalendarMeetingDraft();
  const confirm = useConfirmCalendarSourceActionProposal();

  const handleAdd = () => {
    if (!content.trim()) return;
    add.mutate(
      {
        workspaceId: workspace.id,
        kind,
        content: content.trim(),
        sharedWithGuests: share,
      },
      {
        onSuccess: () => {
          setContent("");
          setShare(false);
          toast.success("Draft added for review");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const reviewDraft = (
    draftId: string,
    expectedVersion: number,
    decision: "PROPOSE" | "DECLINE",
  ) => {
    review.mutate(
      { workspaceId: workspace.id, draftId, expectedVersion, decision },
      {
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const decideProposal = (
    proposalId: string,
    proposalVersion: number,
    steps: Array<{ id: string }>,
    decision: "CONFIRM" | "DECLINE",
  ) => {
    confirm.mutate(
      {
        proposalId,
        expectedVersion: proposalVersion,
        decisions: steps.map((step) => ({ stepId: step.id, decision })),
      },
      {
        onSuccess: () => {
          onRefresh();
          toast.success(
            decision === "CONFIRM"
              ? "Source action reviewed"
              : "Source action declined",
          );
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-2">
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as typeof kind)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTION">Action</SelectItem>
            <SelectItem value="DECISION">Decision</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Capture a proposed decision or follow-up for individual review"
          className="min-h-20 text-sm"
        />
        <div className="flex items-center justify-between gap-3">
          <Label className="flex items-center gap-2 text-xs font-normal">
            <Checkbox
              checked={share}
              onCheckedChange={(value) => setShare(value === true)}
            />
            Share after review
          </Label>
          <Button
            size="sm"
            className="h-8"
            onClick={handleAdd}
            disabled={add.isPending || !content.trim()}
          >
            <ListChecks className="mr-1.5 h-3.5 w-3.5" />
            Add draft
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {workspace.drafts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No proposed outcomes yet.
          </p>
        ) : null}
        {workspace.drafts.map((draft) => (
          <article key={draft.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{draft.kind}</p>
              <Badge variant="outline" className="text-micro">
                {draft.status}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm">{draft.content}</p>
            {draft.status === "DRAFT" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    reviewDraft(draft.id, draft.version, "PROPOSE")
                  }
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    reviewDraft(draft.id, draft.version, "DECLINE")
                  }
                >
                  <CircleX className="mr-1 h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            ) : null}
            {draft.sourceProposal ? (
              <div className="space-y-2 rounded-md bg-muted/40 p-2">
                {draft.sourceProposal.steps.map((step) => (
                  <div key={step.id} className="text-xs">
                    <p className="font-medium">{step.intendedEffect}</p>
                    <p className="text-muted-foreground">
                      {step.sourceKey} · {step.status}
                      {step.outcomeMessage ? ` · ${step.outcomeMessage}` : ""}
                    </p>
                  </div>
                ))}
                {draft.sourceProposal.status === "PROPOSED" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        decideProposal(
                          draft.sourceProposal!.id,
                          draft.sourceProposal!.version,
                          draft.sourceProposal!.steps,
                          "CONFIRM",
                        )
                      }
                    >
                      Apply source action
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        decideProposal(
                          draft.sourceProposal!.id,
                          draft.sourceProposal!.version,
                          draft.sourceProposal!.steps,
                          "DECLINE",
                        )
                      }
                    >
                      Decline
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="text-micro text-muted-foreground">
              {draft.sharedWithGuests && draft.status !== "DRAFT"
                ? "Shared with guests"
                : "Internal"}
              {draft.ownerMembershipId
                ? ` · owner ${draft.ownerMembershipId}`
                : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
