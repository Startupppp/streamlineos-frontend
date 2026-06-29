"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Star, CheckCircle2, XCircle, HelpCircle, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useSubmitScorecard,
  type ScorecardTemplate,
  type InterviewScorecard,
} from "@/hooks/api/hr/recruitment";
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes

const DEFAULT_CRITERIA = [
  "Technical Skills",
  "Communication",
  "Culture Fit",
  "Problem Solving",
];

type Recommendation = "HIRE" | "NO_HIRE" | "MAYBE";

interface RecommendationOption {
  value: Recommendation;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  activeClass: string;
}

const RECOMMENDATION_OPTIONS: RecommendationOption[] = [
  {
    value: "HIRE",
    label: "Hire",
    Icon: CheckCircle2,
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    activeClass: "border-green-500 bg-green-50 dark:bg-green-900/20",
  },
  {
    value: "NO_HIRE",
    label: "No Hire",
    Icon: XCircle,
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    activeClass: "border-red-500 bg-red-50 dark:bg-red-900/20",
  },
  {
    value: "MAYBE",
    label: "Maybe",
    Icon: HelpCircle,
    badgeClass:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    activeClass: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  },
];

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  label: string;
}

function StarRating({ value, onChange, readOnly, label }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const display = hovered > 0 ? hovered : value;

  return (
    <div
      className="flex gap-1"
      role={readOnly ? "img" : "group"}
      aria-label={`${label} rating: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          aria-label={`Rate ${star} out of 5`}
          className={cn(
            "transition-colors",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110",
          )}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              star <= display
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}

interface ReadOnlyViewProps {
  scorecard: InterviewScorecard;
  criteriaNames: string[];
}

function ReadOnlyView({ scorecard, criteriaNames }: ReadOnlyViewProps) {
  const rec = RECOMMENDATION_OPTIONS.find(
    (r) => r.value === scorecard.recommendation,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Scorecard submitted on{" "}
        {scorecard.submittedAt
          ? new Date(scorecard.submittedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Ratings</h4>
        {criteriaNames.map((name) => (
          <div key={name} className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">{name}</span>
            <StarRating
              value={scorecard.ratings[name] ?? 0}
              label={name}
              readOnly
            />
          </div>
        ))}
      </div>

      <Separator />

      {rec && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            Recommendation
          </h4>
          <Badge className={cn("gap-1.5 text-sm", rec.badgeClass)}>
            <rec.Icon className="h-4 w-4" />
            {rec.label}
          </Badge>
        </div>
      )}

      {scorecard.notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Notes</h4>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {scorecard.notes}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export interface ScorecardFormProps {
  interviewId: number;
  template: ScorecardTemplate | null;
  existingScorecard?: InterviewScorecard | null;
}

export function ScorecardForm({
  interviewId,
  template,
  existingScorecard,
}: ScorecardFormProps) {
  const criteriaNames = template?.criteria?.length
    ? template.criteria.map((c) => c.name)
    : DEFAULT_CRITERIA;

  const initialRatings = criteriaNames.reduce<Record<string, number>>(
    (acc, name) => {
      acc[name] = existingScorecard?.ratings?.[name] ?? 0;
      return acc;
    },
    {},
  );

  const [ratings, setRatings] =
    useState<Record<string, number>>(initialRatings);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    existingScorecard?.recommendation ?? null,
  );
  const [notes, setNotes] = useState(existingScorecard?.notes ?? "");

  const submitScorecard = useSubmitScorecard(interviewId);

  const isSubmitted = Boolean(existingScorecard?.submittedAt);
  const isBlindMode = existingScorecard?.isBlindMode ?? false;

  const handleRatingChange = useCallback((criterion: string, value: number) => {
    setRatings((prev) => ({ ...prev, [criterion]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!recommendation) {
      toast.error("Please select a recommendation before submitting.");
      return;
    }

    const unrated = criteriaNames.filter((name) => !ratings[name]);
    if (unrated.length > 0) {
      toast.error(`Please rate: ${unrated.join(", ")}`);
      return;
    }

    submitScorecard.mutate(
      {
        ratings,
        recommendation,
        notes: notes.trim() || undefined,
        templateId: template?.id ?? undefined,
      },
      {
        onSuccess: () => {
          toast.success("Scorecard submitted");
        },
        onError: () => {
          toast.error("Failed to submit scorecard. Please try again.");
        },
      },
    );
  }, [
    ratings,
    recommendation,
    notes,
    criteriaNames,
    template,
    submitScorecard,
  ]);

  if (isSubmitted && existingScorecard) {
    return (
      <ReadOnlyView
        scorecard={existingScorecard}
        criteriaNames={criteriaNames}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isBlindMode && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your scorecard is hidden from others until you submit</span>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">
          Criteria Ratings
        </h4>
        {criteriaNames.map((name) => (
          <div key={name} className="flex items-center justify-between gap-4">
            <span className="text-sm text-foreground">{name}</span>
            <StarRating
              value={ratings[name] ?? 0}
              onChange={(v) => handleRatingChange(name, v)}
              label={name}
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          Recommendation
        </h4>
        <div
          className="flex flex-col gap-2 sm:flex-row"
          role="group"
          aria-label="Hiring recommendation"
        >
          {RECOMMENDATION_OPTIONS.map(
            ({ value, label, Icon, badgeClass, activeClass }) => {
              const selected = recommendation === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRecommendation(value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-md border-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    selected
                      ? activeClass + " border-current"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  <Badge
                    className={cn("gap-1 pointer-events-none", badgeClass)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Badge>
                </button>
              );
            },
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">
          Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </h4>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any observations, feedback, or follow-up items…"
          rows={4}
          className="resize-none"
          aria-label="Scorecard notes"
        />
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={handleSubmit}
        disabled={isSubmitted || submitScorecard.isPending}
        aria-label="Submit scorecard"
      >
        {submitScorecard.isPending ? "Submitting…" : "Submit Scorecard"}
      </Button>
    </div>
  );
}
