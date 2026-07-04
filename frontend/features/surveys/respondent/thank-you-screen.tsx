import { CheckCircle2, ShieldOff, XCircle } from "lucide-react";

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
  const showAssessmentResult = isAssessment && !disqualified && passed !== null && passed !== undefined;
  const iconBg = disqualified ? "bg-amber-100" : showAssessmentResult && !passed ? "bg-red-100" : "bg-emerald-100";

  return (
    <div className="space-y-3 py-6 text-center">
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>
        {disqualified ? (
          <ShieldOff className="h-8 w-8 text-amber-600" />
        ) : showAssessmentResult && !passed ? (
          <XCircle className="h-8 w-8 text-red-600" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        )}
      </div>
      <p className="text-lg font-semibold text-foreground">
        {disqualified ? "Thanks for your time" : showAssessmentResult ? (passed ? "You passed!" : "Not quite") : "Thank you!"}
      </p>
      {showAssessmentResult && typeof score === "number" && (
        <p className="text-2xl font-semibold text-foreground">{score} <span className="text-sm font-normal text-muted-foreground">points</span></p>
      )}
      <p className="text-sm text-muted-foreground">
        {disqualified
          ? disqualificationMessage || "Based on your answers, this survey isn't a fit for you right now."
          : thankYouMessage || "Your response has been recorded."}
      </p>
    </div>
  );
}
