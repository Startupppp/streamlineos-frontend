"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateInterview } from "@/hooks/api/hr";
import { Star, Plus, ClipboardList, BarChart3, MessageSquare } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import type { Interview, InterviewResult, InterviewRubricEntry } from "@/types/hr";

interface StarButtonProps {
  starValue: number;
  displayRating: number;
  onStarClick: (star: number) => void;
  onStarHover: (star: number) => void;
}

function StarButton({ starValue, displayRating, onStarClick, onStarHover }: StarButtonProps) {
  function handleClick() { onStarClick(starValue); }
  function handleMouseEnter() { onStarHover(starValue); }
  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
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
}

interface RubricEntryRowProps {
  entry: InterviewRubricEntry;
  index: number;
  onCategoryNameChange: (index: number, value: string) => void;
  onScoreChange: (index: number, value: number[]) => void;
  onCommentChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function RubricEntryRow({ entry, index, onCategoryNameChange, onScoreChange, onCommentChange, onRemove }: RubricEntryRowProps) {
  function handleCategoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    onCategoryNameChange(index, e.target.value);
  }
  function handleScoreChange(v: number[]) {
    onScoreChange(index, v);
  }
  function handleCommentChange(e: React.ChangeEvent<HTMLInputElement>) {
    onCommentChange(index, e.target.value);
  }
  function handleRemoveClick() {
    onRemove(index);
  }
  return (
    <div
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-primary"
    >
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Input
            value={entry.category}
            onChange={handleCategoryChange}
            placeholder="Category name"
            className="text-xs font-medium flex-1"
          />
          <div className="flex items-center gap-1 shrink-0">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-bold tabular-nums text-foreground w-5 text-center">{entry.score}</span>
            <span className="text-[10px] text-muted-foreground">/{entry.maxScore}</span>
          </div>
          <TooltipIconButton
            type="button"
            variant="ghost"
            icon={XIcon}
            iconSize={12}
            label="Remove category"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive transition-colors duration-200"
            onClick={handleRemoveClick}
          />
        </div>
        <Slider
          value={[entry.score]}
          onValueChange={handleScoreChange}
          max={entry.maxScore}
          step={1}
          className="w-full"
        />
        <Input
          value={entry.comment ?? ""}
          onChange={handleCommentChange}
          placeholder="Notes for this category..."
          className="text-xs"
        />
      </div>
    </div>
  );
}

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

const schema = z.object({
  result: z.enum(["PENDING", "PASSED", "FAILED", "NO_SHOW"]),
  feedback: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface InterviewFeedbackFormProps {
  interview: Interview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewFeedbackForm({ interview, open, onOpenChange }: InterviewFeedbackFormProps) {
  const updateInterview = useUpdateInterview();
  const [overallRating, setOverallRating] = useState(interview.rating ?? 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [rubric, setRubric] = useState<InterviewRubricEntry[]>(
    interview.rubric ?? DEFAULT_RUBRIC_CATEGORIES.map((cat) => ({ category: cat, score: 0, maxScore: 10, comment: "" }))
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      result: interview.result ?? "PENDING",
      feedback: interview.feedback ?? "",
    },
  });

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

  const onSubmit = useCallback((values: FormValues) => {
    if (overallRating === 0) {
      toast.error("Please select an overall rating before submitting.");
      return;
    }
    const validRubric = rubric.filter((r) => r.category.trim().length > 0);
    updateInterview.mutate(
      {
        id: interview.id,
        result: values.result,
        feedback: values.feedback || undefined,
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
  }, [interview.id, overallRating, avgScore, rubric, updateInterview, onOpenChange]);

  const displayRating = hoveredStar || overallRating;

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Interview Feedback"
      description="Rate the candidate and submit your evaluation."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Feedback"
      isPending={updateInterview.isPending}
    >
      <Form {...form}>
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Star className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold text-foreground">Overall Rating</span>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
            <div className="flex items-center gap-1.5" onMouseLeave={handleStarLeave}>
              {Array.from({ length: 5 }).map((_, i) => (
                <StarButton
                  key={i + 1}
                  starValue={i + 1}
                  displayRating={displayRating}
                  onStarClick={handleStarClick}
                  onStarHover={handleStarHover}
                />
              ))}
              {overallRating > 0 && (
                <span className="ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {overallRating}/5
                </span>
              )}
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="result"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-3.5 w-3.5" />
                </div>
                <FormLabel className="text-sm font-semibold text-foreground">Decision</FormLabel>
              </div>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
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
                className="gap-1.5 text-xs"
                onClick={handleAddCategory}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {rubric.map((entry, index) => (
              <RubricEntryRow
                key={index}
                entry={entry}
                index={index}
                onCategoryNameChange={handleCategoryNameChange}
                onScoreChange={handleRubricScoreChange}
                onCommentChange={handleRubricCommentChange}
                onRemove={handleRemoveCategory}
              />
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <FormLabel className="text-sm font-semibold text-foreground">Overall Feedback</FormLabel>
              </div>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Strengths, weaknesses, recommendation..."
                  rows={4}
                  className="resize-none text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </HrSheet>
  );
}
