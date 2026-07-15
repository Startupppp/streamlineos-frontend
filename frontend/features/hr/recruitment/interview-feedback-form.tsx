"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateInterview } from "@/hooks/api/hr";
import { Star, Plus, X, ClipboardList, BarChart3, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Interview, InterviewResult, InterviewRubricEntry } from "@/types/hr";

const DEFAULT_RUBRIC_CATEGORIES = [
  "Technical Skills",
  "Communication",
  "Problem Solving",
  "Culture Fit",
  "Experience",
];

const RESULT_CONFIG: Record<InterviewResult, { label: string; colorClass: string }> = {
  PENDING: { label: "Pending", colorClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300" },
  PASSED: { label: "Passed", colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300" },
  FAILED: { label: "Failed", colorClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300" },
  NO_SHOW: { label: "No Show", colorClass: "bg-muted text-muted-foreground border-border dark:bg-slate-800/60 dark:text-slate-400" },
};

interface InterviewFeedbackFormProps {
  interview: Interview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewFeedbackForm({ interview, open, onOpenChange }: InterviewFeedbackFormProps) {
  const updateInterview = useUpdateInterview();
  const [result, setResult] = useState<InterviewResult>(interview.result ?? "PENDING");
  const [feedback, setFeedback] = useState(interview.feedback ?? "");
  const [overallRating, setOverallRating] = useState(interview.rating ?? 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [rubric, setRubric] = useState<InterviewRubricEntry[]>(
    interview.rubric ?? DEFAULT_RUBRIC_CATEGORIES.map((cat) => ({ category: cat, score: 0, maxScore: 10, comment: "" }))
  );

  const handleRubricScoreChange = useCallback((index: number, score: number[]) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, score: score[0] } : entry));
  }, []);

  const handleRubricCommentChange = useCallback((index: number, comment: string) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, comment } : entry));
  }, []);

  const handleAddCategory = useCallback(() => {
    setRubric((prev) => [...prev, { category: "", score: 0, maxScore: 10, comment: "" }]);
  }, []);

  const handleRemoveCategory = useCallback((index: number) => {
    setRubric((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCategoryNameChange = useCallback((index: number, category: string) => {
    setRubric((prev) => prev.map((entry, i) => i === index ? { ...entry, category } : entry));
  }, []);

  const handleResultChange = useCallback((v: string) => {
    setResult(v as InterviewResult);
  }, []);

  const handleFeedbackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFeedback(e.target.value);
  }, []);

  const handleStarClick = useCallback((star: number) => {
    setOverallRating(star);
  }, []);

  const handleStarHover = useCallback((star: number) => {
    setHoveredStar(star);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoveredStar(0);
  }, []);

  const avgScore = rubric.length > 0
    ? Math.round((rubric.reduce((sum, r) => sum + r.score, 0) / rubric.length) * 10) / 10
    : 0;

  const handleSubmit = useCallback(() => {
    const validRubric = rubric.filter((r) => r.category.trim().length > 0);
    updateInterview.mutate(
      {
        id: interview.id,
        result,
        feedback: feedback || undefined,
        rating: overallRating || avgScore,
        rubric: validRubric.length > 0 ? validRubric : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Feedback submitted");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [interview.id, result, feedback, overallRating, avgScore, rubric, updateInterview, onOpenChange]);

  const displayRating = hoveredStar || overallRating;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Interview Feedback"
      description="Rate the candidate and submit your evaluation."
      onSubmit={handleSubmit}
      submitLabel="Submit Feedback"
      isPending={updateInterview.isPending}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Star className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Overall Rating</span>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-center gap-1.5" onMouseLeave={handleStarLeave}>
            {Array.from({ length: 5 }).map((_, i) => {
              const starValue = i + 1;
              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={() => handleStarClick(starValue)}
                  onMouseEnter={() => handleStarHover(starValue)}
                  className="transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  aria-label={`Rate ${starValue} out of 5`}
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors duration-200",
                      starValue <= displayRating
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              );
            })}
            {overallRating > 0 && (
              <span className="ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {overallRating}/5
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Decision</span>
        </div>
        <Select value={result} onValueChange={handleResultChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {(Object.keys(RESULT_CONFIG) as InterviewResult[]).map((key) => (
              <SelectItem key={key} value={key}>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  RESULT_CONFIG[key].colorClass
                )}>
                  {RESULT_CONFIG[key].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 flex items-center justify-center shrink-0">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-foreground">Scoring Rubric</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-foreground border-border dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700">
              Avg: {avgScore}/10
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleAddCategory}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {rubric.map((entry, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-violet-400"
            >
              <div className="p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Input
                    value={entry.category}
                    onChange={(e) => handleCategoryNameChange(index, e.target.value)}
                    placeholder="Category name"
                    className="h-7 text-xs font-medium flex-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold tabular-nums text-foreground w-5 text-center">{entry.score}</span>
                    <span className="text-[10px] text-muted-foreground">/{entry.maxScore}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive transition-colors duration-200"
                    onClick={() => handleRemoveCategory(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Slider
                  value={[entry.score]}
                  onValueChange={(v) => handleRubricScoreChange(index, v)}
                  max={entry.maxScore}
                  step={1}
                  className="w-full"
                />
                <Input
                  value={entry.comment ?? ""}
                  onChange={(e) => handleRubricCommentChange(index, e.target.value)}
                  placeholder="Notes for this category..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">Overall Feedback</span>
        </div>
        <Textarea
          value={feedback}
          onChange={handleFeedbackChange}
          placeholder="Strengths, weaknesses, recommendation..."
          rows={4}
          className="resize-none text-sm"
        />
      </div>
    </HrSheet>
  );
}
