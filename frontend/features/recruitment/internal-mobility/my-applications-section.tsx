"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useMyInternalApplications } from "@/hooks/api/hr/recruitment/internal-mobility";

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "Received",
  SHORTLISTED: "In review",
  INTERVIEWING: "Interviewing",
  OFFERED: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Not progressing",
  WITHDRAWN: "Withdrawn",
};

const MANAGER_LABELS: Record<string, string> = {
  PENDING: "Manager approval pending",
  APPROVED: "Manager approved",
  DECLINED: "Manager declined",
  NOT_REQUIRED: "No manager approval needed",
};

export function MyInternalApplicationsSection() {
  const { data: applications = [], isLoading, isError } = useMyInternalApplications();

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
