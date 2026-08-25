"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, CheckCircle2, LifeBuoy } from "lucide-react";
import { useSubmitSupportKbFeedback } from "@/hooks/api/support/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface PublicArticleFeedbackProps {
  orgId: string;
  slug: string;
}

export function PublicArticleFeedback({ orgId, slug }: PublicArticleFeedbackProps) {
  const [pendingHelpful, setPendingHelpful] = useState<boolean | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitFeedback = useSubmitSupportKbFeedback();

  function handleVote(helpful: boolean) {
    setPendingHelpful(helpful);
    setShowComment(true);
  }

  function handleCommentChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setComment(e.target.value);
  }

  function handleSubmit() {
    if (pendingHelpful === null) return;
    submitFeedback.mutate(
      { orgId, slug, helpful: pendingHelpful, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          setSubmitted(true);
          setShowComment(false);
          toast.success("Thanks for your feedback!");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <>
      <Card className="mt-10">
        <CardContent className="py-5">
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-sm text-foreground py-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Thanks for your feedback!
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">Was this article helpful?</p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant={pendingHelpful === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVote(true)}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                </Button>
                <Button
                  variant={pendingHelpful === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVote(false)}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" /> No
                </Button>
              </div>
              {showComment && (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={handleCommentChange}
                    placeholder="Tell us more (optional)"
                  />
                  <div className="flex justify-center">
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={submitFeedback.isPending}
                    >
                      {submitFeedback.isPending ? "Submitting…" : "Submit feedback"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-primary/30 bg-primary/5">
        <CardContent className="py-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Still need help?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our support team is happy to assist you.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/contact">Contact support</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
