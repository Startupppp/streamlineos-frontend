import { Badge } from "@/components/ui/badge";
import type { SurveyStatus } from "@/hooks/api/surveys/forms";

const STATUS_CONFIG: Record<SurveyStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  testing: { label: "Testing", variant: "outline" },
  published: { label: "Published", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  closed: { label: "Closed", variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
};

export function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
