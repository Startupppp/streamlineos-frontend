import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

export function QuestionsTab({ survey: _survey }: { survey: SurveyForm }) {
  return (
    <EmptyState
      illustration={<ListChecks className="h-10 w-10 text-muted-foreground/40" />}
      title="Question builder coming soon"
      description="Add sections and questions to this survey."
      compact
    />
  );
}
