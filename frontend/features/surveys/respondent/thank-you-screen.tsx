import { ShieldOff, XCircle } from "lucide-react";
import { SurveyCompleteIllustration } from "@/components/illustrations";

interface ThankYouScreenProps {
  outcome: "completed" | "disqualified";
  thankYouMessage?: string;
  disqualificationMessage?: string;
  isAssessment?: boolean;
  score?: number | null;
  passed?: boolean | null;
}

export function ThankYouScreen({
  outcome,
  thankYouMessage,
  disqualificationMessage,
  isAssessment,
  score,
  passed,
}: ThankYouScreenProps) {
  const disqualified = outcome === "disqualified";
  const showAssessmentResult =
    isAssessment && !disqualified && passed !== null && passed !== undefined;
  const failed = showAssessmentResult && !passed;

  const Icon = disqualified ? ShieldOff : failed ? XCircle : null;
  const iconWrap = disqualified
    ? "bg-status-warning-surface text-status-warning-ink"
    : failed
      ? "bg-status-danger-surface text-status-danger-ink"
      : "bg-status-success-surface text-status-success-ink";

  const heading = disqualified
    ? "Thanks for your time"
    : showAssessmentResult
      ? passed
        ? "You passed!"
        : "Not quite"
      : "Thank you!";

  const body = disqualified
    ? disqualificationMessage ||
      "Based on your answers, this survey isn't a fit for you right now."
    : thankYouMessage || "Your response has been recorded.";

  return (
    <div className="space-y-4 py-2 text-center">
      {Icon ? (
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${iconWrap}`}
        >
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      ) : (
        <SurveyCompleteIllustration className="mx-auto h-36 w-36" />
      )}
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">{heading}</p>
        {showAssessmentResult && typeof score === "number" ? (
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {score}
            <span className="ml-1 text-sm font-normal text-muted-foreground">points</span>
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
