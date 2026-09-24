"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format, isAfter } from "date-fns";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import {
  useInternalJobs,
  useApplyToInternalJob,
  type InternalJob,
} from "@/hooks/api/hr/recruitment/internal-jobs";
import { MyInternalApplicationsSection } from "@/features/hr/recruitment/internal-mobility/my-applications-section";
import { ManagerApprovalsSection } from "@/features/hr/recruitment/internal-mobility/manager-approvals-section";
import { CONFIDENTIALITY_NOTICE } from "@/features/hr/recruitment/internal-mobility/confidentiality-notice";

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};

interface ApplySheetProps {
  job: InternalJob;
  onClose: () => void;
}

function ApplySheet({ job, onClose }: ApplySheetProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const mutation = useApplyToInternalJob(job.id);

  function handleCoverLetterChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setCoverLetter(e.target.value); }
  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }
  function handleSubmitApplication() {
    mutation.mutate(
      { coverLetter: coverLetter.trim() || undefined },
      {
        onSuccess: () => { toast.success("Application submitted!"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Apply Internally — {job.title}</SheetTitle>
          <SheetDescription>Submit your internal application. HR will be notified.</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cover-letter">Cover Letter (optional)</Label>
            <Textarea
              id="cover-letter"
              value={coverLetter}
              onChange={handleCoverLetterChange}
              rows={6}
              placeholder="Why are you interested in this role?"
            />
          </div>
          {/*
            Said before they apply, not in a policy document afterwards.
            Somebody deciding whether to put their name forward is entitled to
            know when their current manager finds out, and a surprise here is
            what stops the next person applying at all.
          */}
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {CONFIDENTIALITY_NOTICE}
          </p>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <LoadingButton onClick={handleSubmitApplication} isPending={mutation.isPending} loadingText="Submitting...">
            Submit Application
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface JobCardItemProps {
  job: InternalJob;
  onApply: (job: InternalJob) => void;
}

function JobCardItem({ job, onApply }: JobCardItemProps) {
  const isExpired = job.applicationDeadline
    ? !isAfter(new Date(job.applicationDeadline), new Date())
    : false;

  function handleApply() { onApply(job); }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">{job.title}</CardTitle>
          <Badge variant="secondary" className="text-micro shrink-0">Internal</Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant="outline" className="text-micro">{TYPE_LABELS[job.type] ?? job.type}</Badge>
          {job.department && <Badge variant="outline" className="text-micro">{job.department.name}</Badge>}
          {job.location && <Badge variant="outline" className="text-micro">{job.location}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pt-0 gap-3">
        <div className="space-y-2 text-xs text-muted-foreground">
          {job.experience && <p>{job.experience} experience required</p>}
          {job.description && (
            <TruncatedText text={job.description.replace(/<[^>]+>/g, "")} lines={3} />
          )}
          <div className="flex items-center justify-between">
            <span>{job.openings} opening{job.openings !== 1 ? "s" : ""}</span>
            {job.applicationDeadline && (
              <span className={isExpired ? "text-destructive" : ""}>
                {isExpired ? "Deadline passed" : `Apply by ${format(new Date(job.applicationDeadline), "MMM d")}`}
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={isExpired}
          onClick={handleApply}
        >
          {isExpired ? "Deadline Passed" : "Apply Internally"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function InternalJobsClient() {
  const { data: jobs = [], isLoading, isError, refetch } = useInternalJobs();
  const [applyingJob, setApplyingJob] = useState<InternalJob | null>(null);

  const handleCloseApplySheet = useCallback(() => { setApplyingJob(null); }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Internal Openings" subtitle="Open positions available exclusively for employees.">
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Internal Openings" subtitle="Open positions available exclusively for employees.">
        <ErrorState
          title="Unable to load internal openings"
          description="Try again. If this keeps happening, check your permissions or contact an admin."
          onRetry={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Internal Openings"
      subtitle="Open positions available exclusively for existing employees. Apply directly without going through external recruitment."
    >
      {/*
        Both render nothing unless the viewer has something in them, so the
        page stays a list of openings for everybody who is neither applying nor
        approving — which is most people, most of the time.
      */}
      <div className="flex flex-col gap-4 mb-4 empty:hidden">
        <ManagerApprovalsSection />
        <MyInternalApplicationsSection />
      </div>

      {jobs.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptySearchIllustration />}
          title="No internal openings"
          description="There are no internal job openings available at this time. Check back later."
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCardItem key={job.id} job={job} onApply={setApplyingJob} />
            ))}
          </div>
        </div>
      )}

      {applyingJob && (
        <ApplySheet job={applyingJob} onClose={handleCloseApplySheet} />
      )}
    </PageWrapper>
  );
}
