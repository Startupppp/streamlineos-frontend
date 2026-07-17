"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useMeetingFollowUpDraft } from "@/hooks/api/crm";
import { DraftComposer } from "@/features/ai-drafts/draft-composer";
import { cn } from "@/lib/utils";

interface MeetingFollowUpComposerProps {
  attendeeType: "lead" | "client";
  attendeeId: number;
  attendeeName?: string;
  meetingTitle?: string;
  scheduledAt?: string;
  onDraftAccepted?: (draft: string) => void;
  className?: string;
}

export function MeetingFollowUpComposer({
  attendeeType,
  attendeeId,
  attendeeName,
  meetingTitle,
  scheduledAt,
  onDraftAccepted,
  className,
}: MeetingFollowUpComposerProps) {
  const [outcome, setOutcome] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [draft, setDraft] = useState<{ draft: string; generatedAt: string } | null>(null);

  const { mutate: generate, isPending } = useMeetingFollowUpDraft();

  const handleOutcomeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOutcome(e.target.value);
  }, []);

  const handleActionItemsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setActionItems(e.target.value);
  }, []);

  const handleGenerate = useCallback(() => {
    if (outcome.trim().length < 10) {
      toast.error("Please describe what happened in the meeting (min 10 characters).");
      return;
    }
    const parsedActionItems = actionItems.trim()
      ? actionItems.split("\n").map((s) => s.trim()).filter(Boolean)
      : undefined;

    generate(
      {
        attendeeType,
        attendeeId,
        outcome: outcome.trim(),
        actionItems: parsedActionItems,
        meetingTitle: meetingTitle ?? "Meeting",
        scheduledAt: scheduledAt ?? new Date().toISOString(),
      },
      {
        onSuccess: (data) => setDraft({ draft: data.draft, generatedAt: data.generatedAt }),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [generate, attendeeType, attendeeId, outcome, actionItems, meetingTitle, scheduledAt]);

  const handleDraftAccepted = useCallback((finalDraft: string) => {
    onDraftAccepted?.(finalDraft);
  }, [onDraftAccepted]);

  const handleDiscard = useCallback(() => {
    setDraft(null);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {attendeeName && (
        <p className="text-xs text-muted-foreground">
          Follow-up for <span className="font-medium text-foreground">{attendeeName}</span>
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">What happened in the meeting?</Label>
        <Textarea
          placeholder="Describe the meeting outcome, key discussion points..."
          value={outcome}
          onChange={handleOutcomeChange}
          className="min-h-[72px] text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Agreed action items (one per line, optional)</Label>
        <Textarea
          placeholder="Send proposal by Friday&#10;Schedule technical demo&#10;Share pricing deck"
          value={actionItems}
          onChange={handleActionItemsChange}
          className="min-h-[56px] text-sm resize-none"
        />
      </div>

      <LoadingButton
        size="sm"
        isPending={isPending}
        loadingText="Generating..."
        onClick={handleGenerate}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
      >
        Generate Follow-up Draft
      </LoadingButton>

      {draft && (
        <DraftComposer
          draft={draft.draft}
          generatedAt={draft.generatedAt}
          onAccept={handleDraftAccepted}
          onDiscard={handleDiscard}
          acceptLabel="Accept Draft"
        />
      )}
    </div>
  );
}
