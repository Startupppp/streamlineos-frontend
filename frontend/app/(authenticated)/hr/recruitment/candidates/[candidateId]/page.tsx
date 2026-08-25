"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useCallback, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useCandidate,
  useUpdateCandidate,
  useCreateInterview,
  useCreateApplication,
  useJobPostings,
  useGenerateCandidateAiScore,
} from "@/hooks/api/hr";
import type { AiScoreResult } from "@/hooks/api/hr";
import {
  useScorecardTemplates,
  useGenerateCandidateCompositeScore,
} from "@/hooks/api/hr/recruitment";
import type { CompositeScoreResult } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import type { CandidateStatus, InterviewType } from "@/types/hr";
import { CandidateDetailSidebar } from "@/features/hr/recruitment/candidate-detail/candidate-detail-sidebar";
import { CandidateDetailTabs } from "@/features/hr/recruitment/candidate-detail/candidate-detail-tabs";
import { useCandidateAiActions } from "@/features/hr/recruitment/candidate-detail/use-candidate-ai-actions";
import {
  ScheduleInterviewSheet,
  ApplyToJobSheet,
} from "@/features/candidates/candidate-sheets";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu } from "@/components/ai";

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const id = Number(candidateId);
  const { data: candidate, isLoading, isError, refetch } = useCandidate(id);
  const { data: jobs } = useJobPostings({ pageSize: 100 });
  const updateCandidate = useUpdateCandidate();
  const createInterview = useCreateInterview();
  const createApplication = useCreateApplication();
  const generateAiScore = useGenerateCandidateAiScore();

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<InterviewType>("VIDEO");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");

  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [latestAiScore, setLatestAiScore] = useState<AiScoreResult | null>(null);
  const [expandedScorecardId, setExpandedScorecardId] = useState<number | null>(null);
  const [compositeScore, setCompositeScore] = useState<CompositeScoreResult | null>(null);

  const { data: scorecardTemplates } = useScorecardTemplates();
  const generateCompositeScore = useGenerateCandidateCompositeScore();
  const canManage = useCan("hr:employees:manage");

  const firstJobPostingId = candidate?.applications?.[0]?.jobPostingId;
  const aiActions = useCandidateAiActions({ candidateId: id, firstJobPostingId });

  const handleStatusChange = useCallback(
    (status: CandidateStatus) => {
      updateCandidate.mutate(
        { id, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [id, updateCandidate],
  );

  const handleScheduleInterview = useCallback(() => {
    if (!scheduledAt) {
      toast.error("Date is required");
      return;
    }
    createInterview.mutate(
      {
        candidateId: id,
        type: interviewType,
        scheduledAt,
        duration: Number(duration) || 60,
        meetingLink: meetingLink || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          setInterviewOpen(false);
          setScheduledAt("");
          setMeetingLink("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [id, interviewType, scheduledAt, duration, meetingLink, createInterview]);

  const handleApplyToJob = useCallback(() => {
    if (!selectedJobId) {
      toast.error("Select a job");
      return;
    }
    createApplication.mutate(
      { candidateId: id, jobPostingId: Number(selectedJobId) },
      {
        onSuccess: () => {
          toast.success("Application submitted");
          setApplyOpen(false);
          setSelectedJobId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [id, selectedJobId, createApplication]);

  const handleGenerateAiScore = useCallback(() => {
    generateAiScore.mutate(id, {
      onSuccess: (data) => {
        setLatestAiScore(data);
        toast.success(`AI Score generated: ${data.overall}/100`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, generateAiScore]);

  const handleGenerateCompositeScore = useCallback(() => {
    generateCompositeScore.mutate(id, {
      onSuccess: (data) => {
        setCompositeScore(data);
        toast.success(`Composite verdict: ${data.verdict}`);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, generateCompositeScore]);

  const handleToggleScorecard = useCallback(
    (interviewId: number) =>
      setExpandedScorecardId((prev) =>
        prev === interviewId ? null : interviewId,
      ),
    [],
  );

  const handleInterviewOpen = useCallback(() => setInterviewOpen(true), []);
  const handleApplyOpen = useCallback(() => setApplyOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const displayAiScore: AiScoreResult | null = useMemo(() => {
    if (latestAiScore) return latestAiScore;
    if (candidate?.aiScore != null && candidate.aiScoreBreakdown) {
      const b = candidate.aiScoreBreakdown;
      return {
        overall: candidate.aiScore,
        breakdown: {
          technicalSkills: Number(b["technicalSkills"] ?? 0),
          experience: Number(b["experience"] ?? 0),
          communication: Number(b["communication"] ?? 0),
          cultureFit: Number(b["cultureFit"] ?? 0),
          leadership: Number(b["leadership"] ?? 0),
        },
        summary: "",
      };
    }
    return null;
  }, [latestAiScore, candidate]);

  const hasSubmittedScorecard = false;

  if (isLoading) {
    return (
      <PageWrapper title="Candidate" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Candidate" subtitle="Unable to load candidate">
        <ErrorState
          title="Unable to load candidate"
          description="This candidate may no longer exist, or you do not have permission to view them. Try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!candidate) {
    return (
      <PageWrapper title="Not Found" subtitle="This candidate no longer exists">
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            The candidate may have been deleted or the link is invalid.
          </p>
          <Button asChild>
            <Link href="/hr/recruitment/candidates">Back to Candidates</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const defaultTemplate = scorecardTemplates?.[0] ?? null;
  const openJobs = jobs?.filter((j) => j.status === "OPEN");

  return (
    <PageWrapper
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={
        candidate.currentRole
          ? `${candidate.currentRole}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}`
          : undefined
      }
      backHref="/hr/recruitment/candidates"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleInterviewOpen}>
            Schedule Interview
          </Button>
          {canManage && aiActions.length > 0 && (
            <AiActionsMenu actions={aiActions} menuLabel="Recruitment AI assist" />
          )}
        </div>
      }
    >
      {candidate.duplicateOfId != null && (
        <div className="flex items-start gap-3 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 mb-4 text-sm">
          <span className="text-status-warning-ink mt-0.5" aria-hidden="true">⚠</span>
          <div className="flex-1">
            <span className="font-medium text-status-warning-ink">Duplicate candidate — </span>
            <span className="text-status-warning-ink">
              This profile was identified as a duplicate of{" "}
              <Link
                href={`/hr/recruitment/candidates/${candidate.duplicateOfId}`}
                className="underline underline-offset-2 hover:no-underline"
              >
                Candidate #{candidate.duplicateOfId}
              </Link>
              . Review and merge if needed.
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <CandidateDetailSidebar
          status={candidate.status}
          rating={candidate.rating}
          email={candidate.email}
          phone={candidate.phone}
          source={candidate.source}
          experienceYears={candidate.experienceYears}
          linkedinUrl={candidate.linkedinUrl}
          skills={candidate.skills}
          notes={candidate.notes}
          displayAiScore={displayAiScore}
          aiScoreGeneratedAt={candidate.aiScoreGeneratedAt}
          isLatestScore={latestAiScore !== null}
          isAiScorePending={generateAiScore.isPending}
          compositeScore={compositeScore}
          isCompositeScorePending={generateCompositeScore.isPending}
          hasSubmittedScorecard={hasSubmittedScorecard}
          isUpdating={updateCandidate.isPending}
          onStatusChange={handleStatusChange}
          onGenerateAiScore={handleGenerateAiScore}
          onGenerateCompositeScore={handleGenerateCompositeScore}
        />

        <CandidateDetailTabs
          candidateId={id}
          candidateName={`${candidate.firstName} ${candidate.lastName}`}
          candidateEmail={candidate.email}
          candidateStatus={candidate.status}
          currentRole={candidate.currentRole ?? null}
          resumeUrl={candidate.resumeUrl}
          resumeText={candidate.resumeText}
          bgvStatus={candidate.bgvStatus ?? null}
          bgvAgency={candidate.bgvAgency ?? null}
          bgvNotes={candidate.bgvNotes ?? null}
          bgvInitiatedAt={candidate.bgvInitiatedAt ? String(candidate.bgvInitiatedAt) : null}
          bgvCompletedAt={candidate.bgvCompletedAt ? String(candidate.bgvCompletedAt) : null}
          applications={candidate.applications}
          interviews={candidate.interviews}
          expandedScorecardId={expandedScorecardId}
          defaultTemplate={defaultTemplate}
          onToggleScorecard={handleToggleScorecard}
          onApplyOpen={handleApplyOpen}
          onScheduleOpen={handleInterviewOpen}
        />
      </div>

      <ScheduleInterviewSheet
        open={interviewOpen}
        onOpenChange={setInterviewOpen}
        interviewType={interviewType}
        scheduledAt={scheduledAt}
        duration={duration}
        meetingLink={meetingLink}
        isPending={createInterview.isPending}
        onInterviewTypeChange={setInterviewType}
        onScheduledAtChange={setScheduledAt}
        onDurationChange={setDuration}
        onMeetingLinkChange={setMeetingLink}
        onSubmit={handleScheduleInterview}
      />

      <ApplyToJobSheet
        open={applyOpen}
        onOpenChange={setApplyOpen}
        selectedJobId={selectedJobId}
        openJobs={openJobs}
        isPending={createApplication.isPending}
        onJobSelect={setSelectedJobId}
        onSubmit={handleApplyToJob}
      />
    </PageWrapper>
  );
}
