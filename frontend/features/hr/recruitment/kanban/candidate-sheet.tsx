"use client";

import { memo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Briefcase,
  MailIcon,
  Phone,
  Star,
  ExternalLink,
  Calendar,
  FileText,
  Download,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import type { AtsPipelineCandidate, CandidateStatus } from "@/types/hr";
import { getInitials, formatDate, SLA_CONFIG, COLUMNS } from "./types";
import { SlaBadge } from "./sla-badge";
import { TruncatedText } from "@/components/ui/truncated-text";

interface CandidateSheetProps {
  candidate: AtsPipelineCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage?: CandidateStatus;
}

type ActiveTab = "overview" | "resume";

export const CandidateSheet = memo(function CandidateSheet({
  candidate,
  open,
  onOpenChange,
  currentStage,
}: CandidateSheetProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  if (!candidate) return null;

  const stageConfig = currentStage ? COLUMNS.find((col) => col.id === currentStage) : undefined;

  function handleTabOverview() {
    setActiveTab("overview");
  }

  function handleTabResume() {
    setActiveTab("resume");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 w-full sm:max-w-[520px]">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0 rounded-xl">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary rounded-xl">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-tight">{candidate.name}</SheetTitle>
              {candidate.jobTitle && (
                <TruncatedText text={candidate.jobTitle} className="text-sm text-muted-foreground mt-0.5" />
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {stageConfig && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      stageConfig.badge
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", stageConfig.dot)} />
                    {stageConfig.label}
                  </span>
                )}
                {candidate.source && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700">
                    {candidate.source}
                  </span>
                )}
                {candidate.slaStatus && <SlaBadge status={candidate.slaStatus} />}
              </div>
            </div>
            <Link
              href={`/hr/recruitment/candidates/${candidate.id}`}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 mt-0.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Profile
            </Link>
          </div>
        </SheetHeader>

        <div className="shrink-0 px-5 pt-3 pb-3 border-b border-border/60">
          <div className="rounded-lg border border-border p-1 inline-flex gap-1">
            <button
              type="button"
              onClick={handleTabOverview}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-200",
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={handleTabResume}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-200",
                activeTab === "resume"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              Resume
            </button>
          </div>
        </div>

        {activeTab === "overview" && (
          <SheetBody className="space-y-3 overscroll-contain px-5 py-4">
            <div className="overflow-hidden rounded-2xl border border-border border-l-4 border-l-blue-400 bg-card shadow-sm">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Contact</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <MailIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <TruncatedText text={candidate.email} className="text-sm" />
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{candidate.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-blue-400">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Briefcase className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Application</span>
                </div>
                <div className="space-y-2">
                  {candidate.jobTitle && (
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm">{candidate.jobTitle}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Applied {formatDate(candidate.appliedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {candidate.rating !== null && candidate.rating !== undefined && (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-amber-400">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Star className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Rating</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < (candidate.rating ?? 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                    <span className="text-sm font-bold tabular-nums ml-2 text-amber-600 dark:text-amber-400">
                      {candidate.rating}/5
                    </span>
                  </div>
                </div>
              </div>
            )}

            {candidate.slaStatus && (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-slate-400">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    SLA Compliance
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        SLA_CONFIG[candidate.slaStatus].dot
                      )}
                    />
                    <span className={cn("text-sm font-semibold", SLA_CONFIG[candidate.slaStatus].label)}>
                      {candidate.slaStatus === "ON_TRACK"
                        ? "On Track"
                        : candidate.slaStatus === "AT_RISK"
                        ? "At Risk"
                        : "Breached"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {candidate.notes && (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-border">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 rounded-lg bg-muted text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <StickyNote className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">Notes</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {candidate.notes}
                  </p>
                </div>
              </div>
            )}
          </SheetBody>
        )}

        {activeTab === "resume" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/60 bg-muted/20 shrink-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Resume
              </p>
              {candidate.resumeUrl && (
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              )}
            </div>
            {candidate.resumeUrl ? (
              <iframe
                src={candidate.resumeUrl}
                title="Candidate Resume"
                className="flex-1 w-full border-0"
              />
            ) : (
              <RecruitmentEmptyState
                illustration={<EmptyDocumentsIllustration />}
                title="No resume uploaded"
                description="The candidate hasn't uploaded a resume yet."
                compact
                className="flex-1 border-0 bg-transparent shadow-none"
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});
