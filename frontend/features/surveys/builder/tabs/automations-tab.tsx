import { Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

export function AutomationsTab({ survey: _survey }: { survey: SurveyForm }) {
  return (
    <EmptyState
      illustration={<Zap className="h-10 w-10 text-muted-foreground/40" />}
      title="No automations yet"
      description="Route leads to CRM, notify sales, or trigger workflows based on responses."
      compact
    />
  );
}
