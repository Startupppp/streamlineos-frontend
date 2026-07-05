import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyIllustration } from "@/components/illustrations";

interface WelcomeScreenProps {
  description: string | null;
  welcomeMessage?: string;
  questionCount: number;
  onStart: () => void;
  isStarting: boolean;
}

export function WelcomeScreen({
  description,
  welcomeMessage,
  questionCount,
  onStart,
  isStarting,
}: WelcomeScreenProps) {
  const estimatedMinutes = Math.max(1, Math.round((questionCount * 15) / 60));

  return (
    <div className="space-y-5 text-center">
      <SurveyIllustration className="mx-auto h-36 w-36" />

      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Share your feedback — it only takes a minute.
        </p>
      )}

      {welcomeMessage ? (
        <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          {welcomeMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>{questionCount} question{questionCount === 1 ? "" : "s"}</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          ~{estimatedMinutes} min
        </span>
      </div>

      <Button onClick={onStart} disabled={isStarting} className="h-11 w-full font-medium">
        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start survey"}
      </Button>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Your responses are used only for this survey&apos;s purpose.
      </p>
    </div>
  );
}
