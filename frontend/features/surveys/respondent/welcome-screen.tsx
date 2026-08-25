import { Clock } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
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

      <LoadingButton onClick={onStart} isPending={isStarting} className="h-11 w-full font-medium">
        Start survey
      </LoadingButton>

      <p className="text-dense leading-relaxed text-muted-foreground">
        Your responses are used only for this survey&apos;s purpose.
      </p>
    </div>
  );
}
