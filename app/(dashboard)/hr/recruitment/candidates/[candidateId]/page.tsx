"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCandidate, useUpdateCandidate, useCreateInterview, useCreateApplication, useJobPostings, useGenerateCandidateAiScore } from "@/lib/api/hooks/hr";
import type { AiScoreResult } from "@/lib/api/hooks/hr";
import { useScorecardTemplates, useGenerateCandidateCompositeScore } from "@/lib/api/hooks/hr/recruitment";
import type { CompositeScoreResult, CompositeVerdict } from "@/lib/api/hooks/hr/recruitment";
import { ScorecardForm } from "@/components/hr/recruitment/scorecard-form";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, Star, ExternalLink, Sparkles, FileText, ShieldCheck, ClipboardCheck, ChevronDown, ChevronUp, FileSignature, Users } from "lucide-react";
import { format } from "date-fns";
import type { CandidateStatus, InterviewType } from "@/types/hr";
import Image from "next/image";
import { DocumentsTab } from "./_components/documents-tab";
import { VaultTab } from "./_components/vault-tab";
import { ReferenceChecksTab } from "./_components/reference-checks-tab";
import { OffersTab } from "./_components/offers-tab";
import { CalibrationTab } from "./_components/calibration-tab";

const STATUSES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

function statusColor(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "HIRED") return "default";
  if (s === "REJECTED") return "destructive";
  if (s === "OFFER" || s === "INTERVIEW") return "secondary";
  return "outline";
}

const AI_SCORE_DIMENSIONS: Array<{ key: keyof AiScoreResult["breakdown"]; label: string }> = [
  { key: "technicalSkills", label: "Technical Skills" },
  { key: "experience", label: "Experience" },
  { key: "communication", label: "Communication" },
  { key: "cultureFit", label: "Culture Fit" },
  { key: "leadership", label: "Leadership" },
];

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}

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
  const [latestAiScore, setLatestAiScore] = useState<AiScoreResult | null>(null);
  const [expandedScorecardId, setExpandedScorecardId] = useState<number | null>(null);
  const [compositeScore, setCompositeScore] = useState<CompositeScoreResult | null>(null);

  const { data: scorecardTemplates } = useScorecardTemplates();
  const generateCompositeScore = useGenerateCandidateCompositeScore();

  const handleStatusChange = useCallback(
    (status: CandidateStatus) => {
      updateCandidate.mutate({ id, status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [id, updateCandidate]
  );

  const handleScheduleInterview = useCallback(() => {
    if (!scheduledAt) { toast.error("Date is required"); return; }
    createInterview.mutate(
      { candidateId: id, type: interviewType, scheduledAt, duration: Number(duration) || 60, meetingLink: meetingLink || undefined },
      {
        onSuccess: () => { toast.success("Interview scheduled"); setInterviewOpen(false); setScheduledAt(""); setMeetingLink(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [id, interviewType, scheduledAt, duration, meetingLink, createInterview]);

  const handleApplyToJob = useCallback(() => {
    if (!selectedJobId) { toast.error("Select a job"); return; }
    createApplication.mutate(
      { candidateId: id, jobPostingId: Number(selectedJobId) },
      {
        onSuccess: () => { toast.success("Application submitted"); setApplyOpen(false); setSelectedJobId(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
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

  function verdictColor(verdict: CompositeVerdict): string {
    if (verdict === "STRONG_HIRE") return "text-green-600";
    if (verdict === "HIRE") return "text-emerald-500";
    if (verdict === "ON_FENCE") return "text-yellow-600";
    return "text-destructive";
  }

  function verdictBadge(verdict: CompositeVerdict): "default" | "secondary" | "outline" | "destructive" {
    if (verdict === "STRONG_HIRE" || verdict === "HIRE") return "default";
    if (verdict === "ON_FENCE") return "secondary";
    return "destructive";
  }

  const displayAiScore = latestAiScore ?? (
    candidate?.aiScore != null && candidate.aiScoreBreakdown
      ? {
          overall: candidate.aiScore,
          breakdown: candidate.aiScoreBreakdown as unknown as AiScoreResult["breakdown"],
          summary: "",
        }
      : null
  );

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
        <Button asChild><Link href="/hr/recruitment/candidates">Back to Candidates</Link></Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`${candidate.firstName} ${candidate.lastName}`}
      subtitle={candidate.currentRole ? `${candidate.currentRole}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}` : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/recruitment/candidates"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link>
          </Button>
          <Button size="sm" onClick={() => setInterviewOpen(true)}>Schedule Interview</Button>
        </div>
      }
    >
      {/* Duplicate candidate warning */}
      {candidate.duplicateOfId != null && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 mb-4 text-sm">
          <span className="text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true">⚠</span>
          <div className="flex-1">
            <span className="font-medium text-amber-800 dark:text-amber-300">Duplicate candidate — </span>
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
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={statusColor(candidate.status)}>{candidate.status}</Badge>
                {candidate.rating && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < candidate.rating! ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.source && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                    <span>Source: {candidate.source}</span>
                  </div>
                )}
                {candidate.experienceYears && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{candidate.experienceYears} years exp.</span>
                  </div>
                )}
              </div>

              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />LinkedIn
                </a>
              )}

              {candidate.skills && candidate.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t">
                <label className="text-xs font-medium mb-1 block">Move to stage</label>
                <Select value={candidate.status ?? "NEW"} onValueChange={(v) => handleStatusChange(v as CandidateStatus)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI Score card */}
          <Card>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI Score
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={handleGenerateAiScore}
                disabled={generateAiScore.isPending}
              >
                {generateAiScore.isPending ? "Scoring..." : displayAiScore ? "Re-score" : "Generate"}
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {displayAiScore ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Overall</span>
                    <span className={`text-2xl font-bold ${scoreColor(displayAiScore.overall)}`}>
                      {displayAiScore.overall}<span className="text-sm text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <Progress value={displayAiScore.overall} className="h-1.5" />
                  <div className="space-y-2 pt-1">
                    {AI_SCORE_DIMENSIONS.map(({ key, label }) => {
                      const score = displayAiScore.breakdown[key] ?? 0;
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={scoreColor(score)}>{score}</span>
                          </div>
                          <Progress value={score} className="h-1" />
                        </div>
                      );
                    })}
                  </div>
                  {displayAiScore.summary && (
                    <p className="text-xs text-muted-foreground italic pt-1 border-t">
                      {displayAiScore.summary}
                    </p>
                  )}
                  {candidate.aiScoreGeneratedAt && !latestAiScore && (
                    <p className="text-[10px] text-muted-foreground">
                      Scored {format(new Date(candidate.aiScoreGeneratedAt), "PPp")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Generate&quot; to score this candidate with AI.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Composite Score card — only shows after ≥1 scorecard submitted */}
          {(candidate.interviews?.some((iv) => (iv as { scorecards?: { submittedAt?: unknown }[] }).scorecards?.some((sc) => sc.submittedAt)) || compositeScore) && (
            <Card>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  Composite Score
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={handleGenerateCompositeScore}
                  disabled={generateCompositeScore.isPending}
                >
                  {generateCompositeScore.isPending ? "Analyzing..." : compositeScore ? "Re-analyze" : "Analyze"}
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {compositeScore ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Verdict</span>
                      <Badge variant={verdictBadge(compositeScore.verdict)} className="text-[10px]">
                        {compositeScore.verdict.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Composite</span>
                      <span className={`text-2xl font-bold ${verdictColor(compositeScore.verdict)}`}>
                        {compositeScore.overall}<span className="text-sm text-muted-foreground">/100</span>
                      </span>
                    </div>
                    <Progress value={compositeScore.overall} className="h-1.5" />
                    {compositeScore.reasoning && (
                      <p className="text-xs text-muted-foreground italic pt-1 border-t">
                        {compositeScore.reasoning}
                      </p>
                    )}
                    {compositeScore.strengthsAcrossRounds.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-green-700 dark:text-green-400 mb-1">Strengths</p>
                        <ul className="space-y-0.5">
                          {compositeScore.strengthsAcrossRounds.map((s, i) => (
                            <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                              <span className="text-green-500 shrink-0">+</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {compositeScore.concernsAcrossRounds.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-destructive mb-1">Concerns</p>
                        <ul className="space-y-0.5">
                          {compositeScore.concernsAcrossRounds.map((c, i) => (
                            <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                              <span className="text-destructive shrink-0">−</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Analyze&quot; to generate a composite hire recommendation across all interview rounds.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {candidate.notes && (
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium">Notes</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-xs text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="applications">
            <TabsList className="mb-4">
              <TabsTrigger value="applications">
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="interviews">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Interviews
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="vault">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="references">
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                References
              </TabsTrigger>
              <TabsTrigger value="offers">
                <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                Offers
              </TabsTrigger>
              <TabsTrigger value="calibration">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Calibration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
              <Card>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Applications</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setApplyOpen(true)}>
                    <Briefcase className="h-3 w-3 mr-1" />Apply to Job
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {!candidate.applications?.length ? (
                    <div className="py-4">
                      <Image
                        src="/illustrations/undraw-online-survey.svg"
                        alt="Empty state illustration"
                        width={200}
                        height={160}
                        className="mx-auto mb-4 opacity-90"
                      />
                      <p className="text-xs text-muted-foreground text-center">No applications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {candidate.applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{app.jobPosting?.title ?? "Unknown Job"}</p>
                            <p className="text-xs text-muted-foreground">{app.appliedAt ? format(new Date(app.appliedAt), "PPP") : ""}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{app.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interviews">
              <Card>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Interviews</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setInterviewOpen(true)}>
                    <Calendar className="h-3 w-3 mr-1" />Schedule
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {!candidate.interviews?.length ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No interviews scheduled.</p>
                  ) : (
                    <div className="space-y-3">
                      {candidate.interviews.map((interview) => {
                        const isExpanded = expandedScorecardId === interview.id;
                        const defaultTemplate = scorecardTemplates?.[0] ?? null;
                        return (
                          <div key={interview.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-3">
                              <div>
                                <p className="text-sm font-medium">{interview.type} Interview</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(interview.scheduledAt), "PPp")} &middot; {interview.duration}min
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={interview.result === "PASSED" ? "default" : interview.result === "FAILED" ? "destructive" : "outline"} className="text-[10px]">
                                  {interview.result ?? "PENDING"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setExpandedScorecardId(isExpanded ? null : interview.id)}
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5" />
                                  Scorecard
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t bg-muted/20 p-4">
                                <ScorecardForm
                                  interviewId={interview.id}
                                  template={defaultTemplate}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                bgvInitiatedAt={candidate.bgvInitiatedAt ? String(candidate.bgvInitiatedAt) : null}
                bgvCompletedAt={candidate.bgvCompletedAt ? String(candidate.bgvCompletedAt) : null}
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
          </Tabs>
        </div>
      </div>

      <HrSheet open={interviewOpen} onOpenChange={setInterviewOpen} title="Schedule Interview" onSubmit={handleScheduleInterview} submitLabel="Schedule" isPending={createInterview.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"] as InterviewType[]).map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date & Time</label>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Meeting Link</label>
            <Input placeholder="https://..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
          </div>
        </div>
      </HrSheet>

      <HrSheet open={applyOpen} onOpenChange={setApplyOpen} title="Apply to Job Posting" onSubmit={handleApplyToJob} submitLabel="Apply" isPending={createApplication.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Job Posting</label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
            <SelectContent>
              {jobs?.filter((j) => j.status === "OPEN").map((j) => (
                <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
