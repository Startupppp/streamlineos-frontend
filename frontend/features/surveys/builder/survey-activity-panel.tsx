"use client";

import { formatDistanceToNow } from "date-fns";
import { Info } from "lucide-react";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import type { SurveyForm } from "@/hooks/api/surveys/forms";

function relativeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function SurveyActivityMenuSection({ survey }: { survey: SurveyForm }) {
  const created = relativeTime(survey.createdAt);
  const updated = relativeTime(survey.updatedAt);
  const archived = relativeTime(survey.archivedAt);

  if (!created && !updated && !archived) return null;

  return (
    <DropdownMenuLabel className="flex items-start gap-2 font-normal text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="space-y-0.5">
        {created ? <p>Created {created}</p> : null}
        {updated ? <p>Last updated {updated}</p> : null}
        {archived ? <p>Archived {archived}</p> : null}
      </span>
    </DropdownMenuLabel>
  );
}
