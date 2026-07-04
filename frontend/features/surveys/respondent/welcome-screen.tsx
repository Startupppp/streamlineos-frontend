import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  title: string;
  description: string | null;
  welcomeMessage?: string;
  questionCount: number;
  onStart: () => void;
  isStarting: boolean;
}

export function WelcomeScreen({ title, description, welcomeMessage, questionCount, onStart, isStarting }: WelcomeScreenProps) {
  const estimatedMinutes = Math.max(1, Math.round((questionCount * 15) / 60));

  return (
    <div className="space-y-5 py-2 text-center">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {welcomeMessage && <p className="text-sm text-muted-foreground">{welcomeMessage}</p>}
      <p className="text-xs text-muted-foreground">
        {questionCount} question{questionCount === 1 ? "" : "s"} &middot; about {estimatedMinutes} minute{estimatedMinutes === 1 ? "" : "s"}
      </p>
      <Button onClick={onStart} disabled={isStarting} className="w-full h-11">
        {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start"}
      </Button>
      <p className="text-[11px] text-muted-foreground">Your responses are used only for this survey&apos;s purpose.</p>
    </div>
  );
}
