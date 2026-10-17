"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useMyInternalApplications } from "@/hooks/api/hr/recruitment/internal-mobility";

/**
 * Plain words for a pipeline status, because the applicant is an employee and
 * not a recruiter. `SHORTLISTED` on a screen somebody reads about their own
 * career is internal vocabulary leaking out of a board.
 */
const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Received",
  SHORTLISTED: "In review",
  INTERVIEWING: "Interviewing",
  OFFERED: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Not progressing",
  WITHDRAWN: "Withdrawn",
};

/**
 * What the applicant is told about their manager's part in it.
 *
 * `NOT_REQUIRED` says so outright rather than showing nothing, because an
 * empty space here reads as "still waiting" and the applicant would go on
 * waiting for an approval nobody was ever asked for.
 */
const MANAGER_LABELS: Record<string, string> = {
  PENDING: "Manager approval pending",
  APPROVED: "Manager approved",
  DECLINED: "Manager declined",
  NOT_REQUIRED: "No manager approval needed",
};

export function MyInternalApplicationsSection() {
  const { data: applications = [], isLoading, isError } = useMyInternalApplications();

  /*
    Silent on failure and silent when empty. This sits above a list of openings
    somebody came here to browse, and an error card about a section they have
    nothing in would be noise on the one screen that has to stay inviting.
  */
  if (isError) return null;

  if (isLoading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }

  if (applications.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Your internal applications</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {applications.map((application) => (
          <div
            key={application.applicationId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{application.jobTitle}</p>
              <p className="text-xs text-muted-foreground">
                Applied {format(new Date(application.appliedAt), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-micro">
                {STATUS_LABELS[application.status] ?? "In review"}
              </Badge>
              {application.managerDecision && (
                <Badge variant="outline" className="text-micro">
                  {MANAGER_LABELS[application.managerDecision] ?? "Manager approval pending"}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
