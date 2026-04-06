"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCandidate, useUpdateCandidate, useCreateInterview, useCreateApplication, useJobPostings } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Briefcase, MapPin, Calendar, Star, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { CandidateStatus, InterviewType } from "@/types/hr";

const STATUSES: CandidateStatus[] = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

function statusColor(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "HIRED") return "default";
  if (s === "REJECTED") return "destructive";
  if (s === "OFFER" || s === "INTERVIEW") return "secondary";
  return "outline";
}

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const id = Number(candidateId);
  const { data: candidate, isLoading } = useCandidate(id);
  const { data: jobs } = useJobPostings();
  const updateCandidate = useUpdateCandidate();
  const createInterview = useCreateInterview();
  const createApplication = useCreateApplication();

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<InterviewType>("VIDEO");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");

  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");

  const handleStatusChange = useCallback(
    (status: CandidateStatus) => {
      updateCandidate.mutate({ id, status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(e.message),
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
        onError: (e) => toast.error(e.message),
      }
    );
  }, [id, interviewType, scheduledAt, duration, meetingLink, createInterview]);

  const handleApplyToJob = useCallback(() => {
    if (!selectedJobId) { toast.error("Select a job"); return; }
    createApplication.mutate(
      { candidateId: id, jobPostingId: Number(selectedJobId) },
      {
        onSuccess: () => { toast.success("Application submitted"); setApplyOpen(false); setSelectedJobId(""); },
        onError: (e) => toast.error(e.message),
      }
    );
  }, [id, selectedJobId, createApplication]);

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
          <Button variant="outline" size="sm" onClick={() => setApplyOpen(true)}>Apply to Job</Button>
          <Button size="sm" onClick={() => setInterviewOpen(true)}>Schedule Interview</Button>
        </div>
      }
    >
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

          {candidate.notes && (
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-xs font-medium">Notes</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0"><p className="text-xs text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Applications</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {!candidate.applications?.length ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No applications yet.</p>
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

          <Card>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Interviews</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {!candidate.interviews?.length ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No interviews scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {candidate.interviews.map((interview) => (
                    <div key={interview.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{interview.type} Interview</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(interview.scheduledAt), "PPp")} &middot; {interview.duration}min</p>
                      </div>
                      <Badge variant={interview.result === "PASSED" ? "default" : interview.result === "FAILED" ? "destructive" : "outline"} className="text-[10px]">
                        {interview.result}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
