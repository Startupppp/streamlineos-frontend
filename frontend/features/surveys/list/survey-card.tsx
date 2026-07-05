import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SurveyStatusBadge } from "./survey-status-badge";
import { SURVEY_MODE_META } from "@/features/surveys/shared/survey-mode-meta";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { formatDistanceToNow } from "date-fns";

export function SurveyCard({ survey }: { survey: SurveyForm }) {
  const modeMeta = SURVEY_MODE_META[survey.mode];
  const ModeIcon = modeMeta.icon;

  return (
    <Link href={`/surveys/${survey.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex items-start gap-2 min-w-0">
            <ModeIcon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{survey.title}</p>
              <p className="text-xs text-muted-foreground">{modeMeta.label}</p>
            </div>
          </div>
          <SurveyStatusBadge status={survey.status} />
        </CardHeader>
        <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{survey.defaultLanguage.toUpperCase()}</span>
          <span>Updated {formatDistanceToNow(new Date(survey.updatedAt), { addSuffix: true })}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
