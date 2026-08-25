"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ScorecardForm } from "@/components/hr/recruitment/scorecard-form";
import type { ScorecardTemplate } from "@/hooks/api/hr/recruitment";

interface Interview {
  id: number;
  type: string | null;
  scheduledAt: string | Date;
  duration: number | null;
  result?: string | null;
  scorecards?: Array<{ submittedAt?: unknown }>;
}

interface InterviewRowProps {
  interview: Interview;
  isExpanded: boolean;
  defaultTemplate: ScorecardTemplate | null;
  onToggle: (id: number) => void;
}

const InterviewRow = memo(function InterviewRow({
  interview,
  isExpanded,
  defaultTemplate,
  onToggle,
}: InterviewRowProps) {
  const handleToggle = useCallback(() => onToggle(interview.id), [onToggle, interview.id]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div>
          <p className="text-sm font-medium">{interview.type ?? "Unknown"} Interview</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(interview.scheduledAt), "PPp")} &middot; {interview.duration ?? "?"}min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              interview.result === "PASSED"
                ? "default"
                : interview.result === "FAILED"
                  ? "destructive"
                  : "outline"
            }
            className="text-micro"
          >
            {interview.result ?? "PENDING"}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={handleToggle}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Scorecard
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t bg-muted/20 p-4">
          <ScorecardForm interviewId={interview.id} template={defaultTemplate} />
        </div>
      )}
    </div>
  );
});

interface InterviewsTabProps {
  interviews?: Interview[] | null;
  expandedScorecardId: number | null;
  defaultTemplate: ScorecardTemplate | null;
  onToggleScorecard: (id: number) => void;
  onScheduleOpen: () => void;
}

export const InterviewsTab = memo(function InterviewsTab({
  interviews,
  expandedScorecardId,
  defaultTemplate,
  onToggleScorecard,
  onScheduleOpen,
}: InterviewsTabProps) {
  const handleScheduleClick = useCallback(() => onScheduleOpen(), [onScheduleOpen]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Interviews</CardTitle>
        <Button size="sm" variant="outline" className="text-xs" onClick={handleScheduleClick}>
          <Calendar className="h-3 w-3 mr-1" />Schedule
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {!interviews?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No interviews scheduled.
          </p>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <InterviewRow
                key={interview.id}
                interview={interview}
                isExpanded={expandedScorecardId === interview.id}
                defaultTemplate={defaultTemplate}
                onToggle={onToggleScorecard}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
