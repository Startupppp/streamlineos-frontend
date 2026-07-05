import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

export function SurveyActivityPanel({ survey }: { survey: SurveyForm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p>Created {formatDistanceToNow(new Date(survey.createdAt), { addSuffix: true })}</p>
        <p>Last updated {formatDistanceToNow(new Date(survey.updatedAt), { addSuffix: true })}</p>
        {survey.archivedAt && <p>Archived {formatDistanceToNow(new Date(survey.archivedAt), { addSuffix: true })}</p>}
      </CardContent>
    </Card>
  );
}
