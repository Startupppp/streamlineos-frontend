"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMyPendingReviews,
  useSubmitFeedbackResponse,
  useFeedbackCycles,
  type FeedbackCycleRequest,
} from "@/hooks/api/hr";

const RELATIONSHIP_COLORS: Record<string, string> = {
  PEER: "bg-blue-100 text-blue-700",
  MANAGER: "bg-violet-100 text-violet-700",
  DIRECT_REPORT: "bg-amber-100 text-amber-700",
  SELF: "bg-muted text-muted-foreground",
};

interface ReviewAnswers {
  [questionId: string]: { rating?: number; text?: string };
}

export function MyReviewsTab() {
  const { data: reviews = [], isLoading } = useMyPendingReviews();
  const submitFeedback = useSubmitFeedbackResponse();
  const { data: cycles = [] } = useFeedbackCycles();

  const [reviewingRequest, setReviewingRequest] = useState<FeedbackCycleRequest | null>(null);
  const [answers, setAnswers] = useState<ReviewAnswers>({});
  const [overallRating, setOverallRating] = useState(0);

  function handleOpenReview(req: FeedbackCycleRequest) {
    setReviewingRequest(req);
    setAnswers({});
    setOverallRating(0);
  }

  function getCycleQuestions(cycleId: number) {
    return cycles.find((c) => c.id === cycleId)?.questions ?? [];
  }

  async function handleSubmitReview() {
    if (!reviewingRequest) return;
    const responses = Object.entries(answers).map(([questionId, ans]) => ({
      questionId,
      rating: ans.rating,
      text: ans.text,
    }));
    try {
      await submitFeedback.mutateAsync({
        requestId: reviewingRequest.id,
        responses,
        overallRating: overallRating || undefined,
      });
      toast.success("Review submitted");
      setReviewingRequest(null);
    } catch {
      toast.error("Failed to submit review");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse space-y-2">
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-3 w-1/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        illustrationPreset="approval"
        title="No pending reviews"
        description="You're all caught up!"
        className="border-0 bg-transparent shadow-none"
      />
    );
  }

  const currentQuestions = reviewingRequest ? getCycleQuestions(reviewingRequest.cycleId) : [];

  return (
    <>
      <div className="space-y-3">
        {reviews.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.06 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                Review for <span className="text-blue-600">{req.subjectId}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Badge className={`text-xs ${RELATIONSHIP_COLORS[req.relationship] ?? "bg-muted text-muted-foreground"}`}>
                  {req.relationship}
                </Badge>
                <Badge className={`text-xs ${req.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                  {req.status}
                </Badge>
              </div>
            </div>
            {req.status === "PENDING" && (
              <Button
                size="sm"
                onClick={() => handleOpenReview(req)}
              >
                Submit Review
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-5 pt-2">
              <p className="text-sm text-muted-foreground">
                For: <span className="font-medium text-foreground">{reviewingRequest.subjectId}</span>
              </p>
              {currentQuestions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <Label className="text-sm">
                    Q{idx + 1}: {q.text}
                  </Label>
                  {q.type === "rating" ? (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], rating: star },
                            }))
                          }
                          className="transition-colors"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              (answers[q.id]?.rating ?? 0) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      placeholder="Your response…"
                      value={answers[q.id]?.text ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], text: e.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setOverallRating(star)}>
                      <Star
                        className={`w-6 h-6 ${
                          overallRating >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  className="w-full"
                  onClick={handleSubmitReview}
                  disabled={submitFeedback.isPending}
                >
                  {submitFeedback.isPending ? "Submitting…" : "Submit Feedback"}
                </Button>
              </motion.div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
