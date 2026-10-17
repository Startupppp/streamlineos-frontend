"use client";

import * as React from "react";
import { ThumbsDownIcon, ThumbsUpIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCan } from "@/hooks/api/access";
import { useCreateAiFeedback } from "@/hooks/api/ai-feedback";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface AiFeedbackButtonsProps {
  /** Stable feature key the backend aggregates feedback by, e.g. "hr.policy-qa". */
  feature: string;
  className?: string;
}

type Rating = "UP" | "DOWN";

export function AiFeedbackButtons({ feature, className }: AiFeedbackButtonsProps) {
  const canGiveFeedback = useCan("ai:feedback:create");
  const createFeedback = useCreateAiFeedback();
  const [voted, setVoted] = React.useState<Rating | null>(null);

  if (!canGiveFeedback) return null;

  function submit(rating: Rating) {
    createFeedback.mutate(
      { feature, rating },
      {
        onSuccess: () => setVoted(rating),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleHelpful() {
    submit("UP");
  }

  function handleNotHelpful() {
    submit("DOWN");
  }

  const disabled = voted !== null || createFeedback.isPending;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <AnimatedIconButton
        icon={ThumbsUpIcon}
        iconSize={12}
        type="button"
        variant={voted === "UP" ? "secondary" : "ghost"}
        size="sm"
        aria-label="Helpful"
        aria-pressed={voted === "UP"}
        className="h-7 w-7 px-0"
        onClick={handleHelpful}
        disabled={disabled}
      />
      <AnimatedIconButton
        icon={ThumbsDownIcon}
        iconSize={12}
        type="button"
        variant={voted === "DOWN" ? "secondary" : "ghost"}
        size="sm"
        aria-label="Not helpful"
        aria-pressed={voted === "DOWN"}
        className="h-7 w-7 px-0"
        onClick={handleNotHelpful}
        disabled={disabled}
      />
      {voted ? (
        <span className="text-xs text-muted-foreground" role="status">
          Thanks
        </span>
      ) : null}
    </div>
  );
}
