"use client";

import { useState, useCallback } from "react";
import { useRecruiters, useRecruiterActivity } from "@/hooks/api/hr/recruitment";
import type { RecruiterSummary, RecruiterActivityEntry } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  CALL_MADE: "Call Made",
  EMAIL_SENT: "Email Sent",
  CANDIDATE_ADDED: "Candidate Added",
  NOTE_ADDED: "Note Added",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
};

const ACTION_COLORS: Record<string, string> = {
  CALL_MADE: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  EMAIL_SENT: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  CANDIDATE_ADDED: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  NOTE_ADDED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
  INTERVIEW_SCHEDULED: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
};

function initials(name: string | null, email: string) {
  if (name) return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function totalActivity(summary: RecruiterSummary["activitySummary"]) {
  return Object.values(summary).reduce((acc, v) => acc + (v ?? 0), 0);
}

interface ActivitySheetProps {
  recruiter: RecruiterSummary;
  onClose: () => void;
}

function ActivitySheet({ recruiter, onClose }: ActivitySheetProps) {
  const { data: activity = [], isLoading } = useRecruiterActivity({
    recruiterId: recruiter.userId,
    limit: 100,
  });

  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{recruiter.name ?? recruiter.email} — Activity</SheetTitle>
          <SheetDescription>Recent recruiter activity log</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-2">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : !activity.length ? (
            <RecruitmentEmptyState
              illustrationPreset="activity"
              title="No activity recorded yet"
              className="border-0 bg-transparent shadow-none"
              compact
            />
          ) : (
            activity.map((entry) => <ActivityEntry key={entry.id} entry={entry} />)
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function ActivityEntry({ entry }: { entry: RecruiterActivityEntry }) {
  const colorClass = ACTION_COLORS[entry.action] ?? "bg-muted text-muted-foreground";
  const label = ACTION_LABELS[entry.action] ?? entry.action;

  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm">
      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {(entry.candidateFirstName || entry.candidateLastName) && (
          <p className="font-medium truncate">
            {[entry.candidateFirstName, entry.candidateLastName].filter(Boolean).join(" ")}
          </p>
        )}
        {entry.jobTitle && (
          <p className="text-muted-foreground text-xs truncate">{entry.jobTitle}</p>
        )}
        {entry.notes && (
          <p className="text-muted-foreground text-xs truncate">{entry.notes}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {format(new Date(entry.createdAt), "MMM d")}
      </span>
    </div>
  );
}

function RecruiterCard({
  recruiter,
  onViewActivity,
}: {
  recruiter: RecruiterSummary;
  onViewActivity: (r: RecruiterSummary) => void;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={recruiter.image ?? undefined} />
            <AvatarFallback className="text-xs">{initials(recruiter.name, recruiter.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm truncate">{recruiter.name ?? recruiter.email}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">{recruiter.email}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">{recruiter.role}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-base font-semibold">{recruiter.assignedJobsCount}</p>
            <p className="text-[10px] text-muted-foreground">Jobs</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-base font-semibold">
              {(recruiter.activitySummary.CANDIDATE_ADDED ?? 0) + (recruiter.activitySummary.INTERVIEW_SCHEDULED ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Placed</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-base font-semibold">{totalActivity(recruiter.activitySummary)}</p>
            <p className="text-[10px] text-muted-foreground">Actions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onViewActivity(recruiter)}
        >
          View Activity
        </Button>
      </CardContent>
    </Card>
  );
}

export default function RecruitersPage() {
  const { data: recruiters = [], isLoading } = useRecruiters();
  const [selectedRecruiter, setSelectedRecruiter] = useState<RecruiterSummary | null>(null);

  const handleViewActivity = useCallback((r: RecruiterSummary) => {
    setSelectedRecruiter(r);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedRecruiter(null);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Recruiters" subtitle="Team members involved in hiring">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recruiters"
      subtitle="HR team members with active job assignments and activity tracking"
      badge={`${recruiters.length} members`}
    >
      {recruiters.length === 0 ? (
        <RecruitmentEmptyState
          illustration={<EmptyTeamIllustration />}
          title="No recruiters found"
          description="Users with HR, HR_MANAGER, CEO, ADMIN, or RECRUITER roles will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recruiters.map((recruiter) => (
            <RecruiterCard
              key={recruiter.userId}
              recruiter={recruiter}
              onViewActivity={handleViewActivity}
            />
          ))}
        </div>
      )}

      {selectedRecruiter && (
        <ActivitySheet recruiter={selectedRecruiter} onClose={handleCloseSheet} />
      )}
    </PageWrapper>
  );
}
