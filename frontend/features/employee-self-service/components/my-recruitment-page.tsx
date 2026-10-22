"use client";

import { useCallback, useMemo, useState } from "react";
import type { SelfServiceHubChrome } from "@/lib/self-service-hub-chrome";
import { format } from "date-fns";
import { CheckCircle2, ExternalLink, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  type AssignedInterview,
  useAssignedInterviews,
} from "@/hooks/api/employee-self-service/recruitment";
import {
  PAGE_BODY_SKELETON_CLASS,
  PAGE_BODY_EMPTY_CLASS,
} from "@/components/ui/content-fill-panel";
import { FeedbackSheet } from "./interview-feedback-sheet";

function safeMeetingLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function MyRecruitmentPage({ hubChrome }: { hubChrome?: SelfServiceHubChrome } = {}) {
  const [page, setPage] = useState(1);
  const [feedbackInterview, setFeedbackInterview] =
    useState<AssignedInterview | null>(null);
  const interviews = useAssignedInterviews(page);
  const data = interviews.data;
  const pageState = usePageState({
    permission: "self:recruitment",
    isLoading: interviews.isLoading,
    isError: interviews.isError,
    error: interviews.error,
    isEmpty: data?.items.length === 0,
  });

  const upcomingCount = useMemo(
    () =>
      data?.items.filter(
        (interview) =>
          interview.result === "PENDING" &&
          new Date(interview.scheduledAt).getTime() >= Date.now(),
      ).length ?? 0,
    [data?.items],
  );

  const handleSheetChange = useCallback((open: boolean) => {
    if (!open) setFeedbackInterview(null);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setPage((value) => Math.max(1, value - 1));
  }, []);

  return (
    <PageWrapper
      title={hubChrome?.title ?? "My Recruitment"}
      subtitle={hubChrome?.subtitle ?? "Your assigned interviews and hiring feedback actions."}
      filters={hubChrome?.tabs}
      state={pageState}
      onRetry={interviews.refetch}
      loading={
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      }
      empty={
        <EmptyState
          illustrationPreset="calendar"
          title="No assigned interviews"
          description="Interviews assigned to you will appear here."
          className={PAGE_BODY_EMPTY_CLASS}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
      {data && data.items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {data.total} assigned · {upcomingCount} upcoming on this page
          </p>
          {data.items.map((interview) => {
            const submitted = Boolean(interview.scorecardSubmittedAt);
            const meetingLink = safeMeetingLink(interview.meetingLink);
            return (
              <Card key={interview.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {interview.candidateFirstName} {interview.candidateLastName}
                      </p>
                      <Badge variant="outline" className="text-micro">
                        {interview.type}
                      </Badge>
                      {submitted ? (
                        <Badge variant="secondary" className="gap-1 text-micro">
                          <CheckCircle2 className="h-3 w-3" /> Feedback submitted
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(interview.scheduledAt), "EEE, MMM d · h:mm a")} · {interview.duration} min
                      {interview.jobTitle ? ` · ${interview.jobTitle}` : ""}
                    </p>
                    {interview.location ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {interview.location}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {meetingLink ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meetingLink} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Join
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant={submitted ? "outline" : "default"}
                      disabled={submitted}
                      onClick={() => setFeedbackInterview(interview)}
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      {submitted ? "Submitted" : "Feedback"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {data.totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      {feedbackInterview && (
        <FeedbackSheet
          interview={feedbackInterview}
          onOpenChange={handleSheetChange}
        />
      )}
    </PageWrapper>
  );
}
