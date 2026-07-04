import { CheckCircle2, ShieldOff } from "lucide-react";

interface ThankYouScreenProps {
  outcome: "completed" | "disqualified";
  thankYouMessage?: string;
  disqualificationMessage?: string;
}

export function ThankYouScreen({ outcome, thankYouMessage, disqualificationMessage }: ThankYouScreenProps) {
  const disqualified = outcome === "disqualified";
  return (
    <div className="space-y-3 py-6 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${disqualified ? "bg-amber-100" : "bg-emerald-100"}`}
      >
        {disqualified ? (
          <ShieldOff className="h-8 w-8 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        )}
      </div>
      <p className="text-lg font-semibold text-foreground">{disqualified ? "Thanks for your time" : "Thank you!"}</p>
      <p className="text-sm text-muted-foreground">
        {disqualified
          ? disqualificationMessage || "Based on your answers, this survey isn't a fit for you right now."
          : thankYouMessage || "Your response has been recorded."}
      </p>
    </div>
  );
}
