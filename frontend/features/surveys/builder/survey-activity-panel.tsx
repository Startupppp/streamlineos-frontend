"use client";

import { Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

function relativeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function SurveyActivityInfo({ survey }: { survey: SurveyForm }) {
  const created = relativeTime(survey.createdAt);
  const updated = relativeTime(survey.updatedAt);
  const archived = relativeTime(survey.archivedAt);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground"
            aria-label="Survey activity"
          >
            <Info className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="space-y-0.5 px-3 py-2">
          {created ? <p>Created {created}</p> : null}
          {updated ? <p>Last updated {updated}</p> : null}
          {archived ? <p>Archived {archived}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
