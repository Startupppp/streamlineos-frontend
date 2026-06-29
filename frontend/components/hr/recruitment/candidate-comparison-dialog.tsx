"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Candidate } from "@/types/hr/recruitment";

interface Props {
  candidates: Candidate[];
  onClose: () => void;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  technicalSkills: "Technical",
  experience: "Experience",
  communication: "Communication",
  cultureFit: "Culture Fit",
  leadership: "Leadership",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}/10</span>
      </div>
      <Progress value={value * 10} className="h-1.5" />
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`h-3.5 w-3.5 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function CandidateColumn({
  candidate,
  allSkills,
}: {
  candidate: Candidate;
  allSkills: Set<string>;
}) {
  const name = `${candidate.firstName} ${candidate.lastName}`;
  const breakdown = candidate.aiScoreBreakdown;
  const interviews = candidate.interviews ?? [];
  const completedInterviews = interviews.filter((i) => i.result && i.result !== "PENDING");
  const avgInterviewRating =
    completedInterviews.length > 0
      ? completedInterviews.reduce((sum, i) => sum + (i.rating ?? 0), 0) / completedInterviews.length
      : null;

  return (
    <div className="flex-1 min-w-0 space-y-4 px-3">
      <div className="text-center space-y-1.5">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-sm font-semibold text-primary">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <p className="text-sm font-semibold truncate">{name}</p>
        {candidate.currentRole && (
          <p className="text-xs text-muted-foreground truncate">{candidate.currentRole}</p>
        )}
        {candidate.currentCompany && (
          <p className="text-xs text-muted-foreground truncate">{candidate.currentCompany}</p>
        )}
        <Badge
          variant={
            candidate.status === "HIRED" ? "default" :
            candidate.status === "REJECTED" ? "destructive" : "secondary"
          }
          className="text-[10px]"
        >
          {candidate.status ?? "NEW"}
        </Badge>
      </div>

      <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">AI Score</span>
          <span className="text-lg font-bold tabular-nums">
            {candidate.aiScore != null ? candidate.aiScore : "—"}
            {candidate.aiScore != null && <span className="text-xs text-muted-foreground font-normal">/100</span>}
          </span>
        </div>
        {breakdown && Object.keys(breakdown).length > 0 ? (
          <div className="space-y-1.5">
            {Object.entries(breakdown).map(([key, val]) => (
              <ScoreBar key={key} label={BREAKDOWN_LABELS[key] ?? key} value={Number(val)} />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground text-center py-1">No AI score</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Profile</p>
        <div className="space-y-1.5 text-xs">
          {candidate.experienceYears && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{candidate.experienceYears} yrs exp</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{candidate.email}</span>
          </div>
          {candidate.location && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{candidate.location}</span>
            </div>
          )}
          {candidate.source && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="truncate capitalize">{candidate.source.toLowerCase().replace(/_/g, " ")}</span>
            </div>
          )}
        </div>
      </div>

      {interviews.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Interviews ({interviews.length})</p>
          <div className="space-y-1">
            {avgInterviewRating != null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Avg rating</span>
                <span className="font-medium">{avgInterviewRating.toFixed(1)}/10</span>
              </div>
            )}
            {completedInterviews.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate capitalize">{(iv.type ?? "Interview").toLowerCase()}</span>
                <Badge
                  variant={iv.result === "PASSED" ? "default" : iv.result === "FAILED" ? "destructive" : "secondary"}
                  className="text-[9px] px-1 py-0"
                >
                  {iv.result ?? "Pending"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {candidate.rating != null && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Rating</p>
          <StarRating rating={candidate.rating} />
        </div>
      )}

      {(candidate.skills ?? []).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Skills</p>
          <div className="flex flex-wrap gap-1">
            {(candidate.skills ?? []).map((s) => {
              const isShared = allSkills.has(s.toLowerCase()) && allSkills.size > 1;
              return (
                <Badge
                  key={s}
                  variant={isShared ? "default" : "outline"}
                  className="text-[10px] px-1.5 py-0"
                  title={isShared ? "Shared skill across candidates" : "Unique to this candidate"}
                >
                  {s}
                </Badge>
              );
            })}
          </div>
          <p className="text-[9px] text-muted-foreground">Highlighted = shared skill</p>
        </div>
      )}
    </div>
  );
}

export function CandidateComparisonDialog({ candidates, onClose }: Props) {
  const allSkillSets = candidates.map((c) => new Set((c.skills ?? []).map((s) => s.toLowerCase())));
  const sharedSkills = allSkillSets.reduce((intersection, set) => {
    if (intersection.size === 0) return set;
    return new Set([...intersection].filter((s) => set.has(s)));
  }, new Set<string>());

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl w-full p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">Compare Candidates</DialogTitle>
          <DialogDescription className="text-xs">
            Side-by-side comparison of {candidates.length} finalist{candidates.length !== 1 ? "s" : ""}.
            {sharedSkills.size > 0 && ` ${sharedSkills.size} shared skill${sharedSkills.size !== 1 ? "s" : ""} highlighted.`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="flex divide-x px-4 py-4">
            {candidates.map((c) => (
              <CandidateColumn key={c.id} candidate={c} allSkills={sharedSkills} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
