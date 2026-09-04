"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type AssignedInterview,
  useSubmitAssignedInterviewScorecard,
} from "@/hooks/api/employee-self-service/recruitment";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * The scorecard an interviewer fills in for one assigned interview.
 *
 * It is the only WRITE on this surface — the page around it is a paged read of
 * the interviews assigned to the signed-in member — and it owns its own draft
 * state, its own submit mutation and its own validation. Keeping it here means
 * the page is a list and this is a form, rather than one file being both.
 */

type Recommendation = "HIRE" | "NO_HIRE" | "MAYBE";

export function FeedbackSheet({
  interview,
  onOpenChange,
}: {
  interview: AssignedInterview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [rating, setRating] = useState("3");
  const [recommendation, setRecommendation] = useState<Recommendation>("MAYBE");
  const [notes, setNotes] = useState("");
  const submit = useSubmitAssignedInterviewScorecard(interview?.id ?? 0);

  const handleSubmit = useCallback(async () => {
    if (!interview) return;
    try {
      await submit.mutateAsync({
        ratings: { overall: Number(rating) },
        recommendation,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success("Interview feedback submitted");
      onOpenChange(false);
      setRating("3");
      setRecommendation("MAYBE");
      setNotes("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [interview, notes, onOpenChange, rating, recommendation, submit]);

  return (
    <Sheet open={Boolean(interview)} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-base">Submit Interview Feedback</SheetTitle>
          <SheetDescription className="text-xs">
            {interview
              ? `${interview.candidateFirstName} ${interview.candidateLastName}`
              : "Record your hiring recommendation."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            <Label>Overall rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger aria-label="Overall rating">
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} / 5
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Recommendation</Label>
            <Select
              value={recommendation}
              onValueChange={(value) => setRecommendation(value as Recommendation)}
            >
              <SelectTrigger aria-label="Recommendation">
                <SelectValue placeholder="Select a recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIRE">Hire</SelectItem>
                <SelectItem value="MAYBE">Maybe</SelectItem>
                <SelectItem value="NO_HIRE">Do not hire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interview-feedback-notes">Notes</Label>
            <Textarea
              id="interview-feedback-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Summarize strengths, concerns, and evidence from the interview."
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton isPending={submit.isPending} onClick={handleSubmit} loadingText="Submitting…">
            Submit Feedback
          </LoadingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
