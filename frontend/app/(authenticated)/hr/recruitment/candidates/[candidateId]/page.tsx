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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  FileSignature,
  Users,
  MessageSquare,
  History,
  Share2,
} from "lucide-react";
import type { CandidateStatus, InterviewType } from "@/types/hr";
import { DocumentsTab } from "@/features/hr/recruitment/candidate-detail/documents-tab";
import { VaultTab } from "@/features/hr/recruitment/candidate-detail/vault-tab";
import { ReferenceChecksTab } from "@/features/hr/recruitment/candidate-detail/reference-checks-tab";
import { OffersTab } from "@/features/hr/recruitment/candidate-detail/offers-tab";
import { CalibrationTab } from "@/features/hr/recruitment/candidate-detail/calibration-tab";
import { ResumeTab } from "@/features/hr/recruitment/candidate-detail/resume-tab";
import { ReferralsTab } from "@/features/hr/recruitment/candidate-detail/referrals-tab";
import { ActivityTab } from "@/features/hr/recruitment/candidate-detail/activity-tab";
import { CandidateProfileCard } from "@/features/candidates/candidate-profile-card";
import { AiScoreCard } from "@/features/candidates/ai-score-card";
import { CompositeScoreCard } from "@/features/candidates/composite-score-card";
import { ApplicationsTab } from "@/features/candidates/applications-tab";
import { InterviewsTab } from "@/features/candidates/interviews-tab";
import {
  ScheduleInterviewSheet,
  ApplyToJobSheet,
} from "@/features/candidates/candidate-sheets";
import { MessagesTab } from "@/features/candidates/messages-tab";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import {
  useAIScoreCandidate,
  useAIInterviewKit,
  useAIInterviewNotesSummary,
} from "@/hooks/api/ai";

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const id = Number(candidateId);
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: jobs } = useJobPostings();
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
  const [latestAiScore, setLatestAiScore] = useState<AiScoreResult | null>(
    null,
  );
  const [expandedScorecardId, setExpandedScorecardId] = useState<number | null>(
    null,
  );
  const [compositeScore, setCompositeScore] =
    useState<CompositeScoreResult | null>(null);

  const { data: scorecardTemplates } = useScorecardTemplates();
  const generateCompositeScore = useGenerateCandidateCompositeScore();

  const canManage = useCan("hr:employees:manage");
  const scoreCandidateMutation = useAIScoreCandidate();
  const interviewKitMutation = useAIInterviewKit();
  const interviewNotesSummaryMutation = useAIInterviewNotesSummary();

  const aiActions = useMemo<AiAction[]>(() => {
    if (!canManage) return [];
    return [
      {
        key: "fit-estimate",
        label: "AI fit estimate (advisory)",
        description: "AI-estimated candidate fit score — requires human review",
        run: async () => {
          const result = await scoreCandidateMutation.mutateAsync({ candidateId: id });
          return {
            text: `Fit score: ${result.score}/100 (${result.fitLevel})\n\nReasoning: ${result.reasoning}\n\nStrengths:\n${result.strengths.map((s) => "• " + s).join("\n")}\n\nConcerns:\n${result.concerns.map((c) => "• " + c).join("\n")}\n\nSuggested questions:\n${result.suggestedQuestions.map((q) => "• " + q).join("\n")}\n\n⚠ Advisory only. This AI estimate must not be used to automatically accept or reject candidates — human decision required.`,
          };
        },
      },
      {
        key: "interview-kit",
        label: "Interview kit",
        description: "Generate structured interview questions and rubric",
        run: async () => {
          const jobPostingId = candidate?.applications?.[0]?.jobPostingId ?? id;
          const result = await interviewKitMutation.mutateAsync(jobPostingId);
          const body = result.roundKits.map((kit) => `## ${kit.round}\n${kit.questions.map((q) => `Q: ${q.question}\nCategory: ${q.category}\nExpected: ${q.expectedAnswer}`).join("\n\n")}`).join("\n\n---\n\n");
          return { text: body + (result.disclaimer ? `\n\n⚠ ${result.disclaimer}` : "") };
        },
      },
      {
        key: "interview-notes",
        label: "Summarize interview notes",
        description: "Distill all interview notes into a recommendation",
        run: async () => {
          const result = await interviewNotesSummaryMutation.mutateAsync({ candidateId: id });
          const body = `Recommendation: ${result.overallRecommendation}\nConfidence: ${result.confidence}\n\nStrengths: ${result.strengthsSummary}\n\nConcerns: ${result.concernsSummary}\n\nSuggested next step: ${result.suggestedNextStep}`;
          return { text: body + (result.disclaimer ? `\n\n⚠ ${result.disclaimer}` : "") };
        },
      },
    ];
  }, [canManage, id, candidate, scoreCandidateMutation, interviewKitMutation, interviewNotesSummaryMutation]);

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

  const displayAiScore =
    latestAiScore ??
    (candidate?.aiScore != null && candidate.aiScoreBreakdown
      ? {
          overall: candidate.aiScore,
          breakdown: candidate.aiScoreBreakdown as unknown as AiScoreResult["breakdown"],
          summary: "",
        }
      : null);

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

  if (!candidate) {
    return (
      <PageWrapper title="Not Found" subtitle="Candidate not found">
        <Button asChild>
          <Link href="/hr/recruitment/candidates">Back to Candidates</Link>
        </Button>
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
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment/candidates">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
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
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 mb-4 text-sm">
          <span
            className="text-amber-600 dark:text-amber-400 mt-0.5"
            aria-hidden="true"
          >
            ⚠
          </span>
          <div className="flex-1">
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Duplicate candidate —{" "}
            </span>
            <span className="text-amber-700 dark:text-amber-400">
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
        <div className="lg:col-span-1 space-y-4">
          <CandidateProfileCard
            status={candidate.status}
            rating={candidate.rating}
            email={candidate.email}
            phone={candidate.phone}
            source={candidate.source}
            experienceYears={candidate.experienceYears}
            linkedinUrl={candidate.linkedinUrl}
            skills={candidate.skills}
            onStatusChange={handleStatusChange}
            isUpdating={updateCandidate.isPending}
          />

          <AiScoreCard
            displayAiScore={displayAiScore}
            aiScoreGeneratedAt={candidate.aiScoreGeneratedAt}
            isLatestScore={latestAiScore !== null}
            isPending={generateAiScore.isPending}
            onGenerate={handleGenerateAiScore}
          />

          {(hasSubmittedScorecard || compositeScore) && (
            <CompositeScoreCard
              compositeScore={compositeScore}
              isPending={generateCompositeScore.isPending}
              onGenerate={handleGenerateCompositeScore}
            />
          )}

          {candidate.notes && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {candidate.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="applications">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="applications">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="resume">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Resume
              </TabsTrigger>
              <TabsTrigger value="interviews">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="messages">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="referrals">
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Referrals
              </TabsTrigger>
              <TabsTrigger value="offers">
                <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                Offers
              </TabsTrigger>
              <TabsTrigger value="vault">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="references">
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                References
              </TabsTrigger>
              <TabsTrigger value="calibration">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Calibration
              </TabsTrigger>
              <TabsTrigger value="activity">
                <History className="h-3.5 w-3.5 mr-1.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <ApplicationsTab
                applications={candidate.applications}
                onApplyOpen={handleApplyOpen}
              />
            </TabsContent>

            <TabsContent value="resume">
              <ResumeTab resumeUrl={candidate.resumeUrl} resumeText={candidate.resumeText} />
            </TabsContent>

            <TabsContent value="interviews">
              <InterviewsTab
                interviews={candidate.interviews}
                expandedScorecardId={expandedScorecardId}
                defaultTemplate={defaultTemplate}
                onToggleScorecard={handleToggleScorecard}
                onScheduleOpen={handleInterviewOpen}
              />
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Offer Documents</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <DocumentsTab
                    candidateId={id}
                    candidateName={`${candidate.firstName} ${candidate.lastName}`}
                    jobTitle={candidate.currentRole ?? undefined}
                    candidateStatus={candidate.status}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vault">
              <VaultTab
                candidateId={id}
                bgvStatus={candidate.bgvStatus ?? null}
                bgvAgency={candidate.bgvAgency ?? null}
                bgvNotes={candidate.bgvNotes ?? null}
                bgvInitiatedAt={
                  candidate.bgvInitiatedAt
                    ? String(candidate.bgvInitiatedAt)
                    : null
                }
                bgvCompletedAt={
                  candidate.bgvCompletedAt
                    ? String(candidate.bgvCompletedAt)
                    : null
                }
              />
            </TabsContent>

            <TabsContent value="references">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Reference Checks</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ReferenceChecksTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offers">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Offer Tracking</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <OffersTab candidateId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calibration">
              <CalibrationTab candidateId={id} />
            </TabsContent>

            <TabsContent value="messages">
              <MessagesTab candidateId={id} candidateEmail={candidate.email} />
            </TabsContent>

            <TabsContent value="referrals">
              <ReferralsTab candidateId={id} />
            </TabsContent>

            <TabsContent value="activity">
              <ActivityTab candidateId={id} />
            </TabsContent>
          </Tabs>
        </div>
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
