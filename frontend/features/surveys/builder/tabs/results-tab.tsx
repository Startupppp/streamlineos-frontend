import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

export function ResultsTab({ survey: _survey }: { survey: SurveyForm }) {
  return (
    <EmptyState
      illustration={<BarChart3 className="h-10 w-10 text-muted-foreground/40" />}
      title="No responses yet"
      description="Results, question analytics, and exports will appear here once responses come in."
      compact
    />
  );
}
