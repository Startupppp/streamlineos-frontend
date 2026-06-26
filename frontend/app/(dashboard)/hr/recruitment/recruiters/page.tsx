"use client";

import { useState, useCallback } from "react";
import { useRecruiters, useRecruiterActivity } from "@/lib/api/hooks/hr/recruitment";
import type { RecruiterSummary, RecruiterActivityEntry } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
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
  CALL_MADE: "bg-blue-100 text-blue-700",
  EMAIL_SENT: "bg-purple-100 text-purple-700",
  CANDIDATE_ADDED: "bg-green-100 text-green-700",
  NOTE_ADDED: "bg-yellow-100 text-yellow-700",
  INTERVIEW_SCHEDULED: "bg-orange-100 text-orange-700",
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{recruiter.name ?? recruiter.email} — Activity</SheetTitle>
          <SheetDescription>Recent recruiter activity log</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : !activity.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
          ) : (
            activity.map((entry) => <ActivityEntry key={entry.id} entry={entry} />)
          )}
        </div>
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
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
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
        <EmptyState
          illustration={
            <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
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
