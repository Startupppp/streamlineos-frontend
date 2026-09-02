"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, Building2, Clock, Star, Pencil, Trash2 } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { formatDistanceToNow } from "date-fns";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { FilterPill } from "@/components/ui/filter-pill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIScoreCandidateButton } from "@/features/hr/recruitment/ai-score-candidate-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { Candidate, CandidateStatus } from "@/types/hr";

export const STAGE_CONFIG: {
  value: CandidateStatus;
  label: string;
  accent: string;
  pill: string;
  dot: string;
  activePill: string;
}[] = [
  {
    value: "NEW",
    label: "New",
    accent: "border-l-border",
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    activePill: "bg-primary text-primary-foreground",
  },
  {
    value: "SCREENING",
    label: "Screening",
    accent: "border-l-blue-500",
    pill: "bg-status-info-surface text-status-info-ink",
    dot: "bg-status-info-fill",
    activePill: "bg-status-info-fill text-white",
  },
  {
    value: "INTERVIEW",
    label: "Interview",
    accent: "border-l-amber-500",
    pill: "bg-status-warning-surface text-status-warning-ink",
    dot: "bg-status-warning-fill",
    activePill: "bg-status-warning-fill text-white",
  },
  {
    value: "OFFER",
    label: "Offer",
    accent: "border-l-blue-500",
    pill: "bg-status-info-surface text-status-info-ink",
    dot: "bg-status-info-fill",
    activePill: "bg-status-info-fill text-white",
  },
  {
    value: "HIRED",
    label: "Hired",
    accent: "border-l-emerald-500",
    pill: "bg-status-success-surface text-status-success-ink",
    dot: "bg-status-success-fill",
    activePill: "bg-status-success-fill text-white",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    accent: "border-l-rose-400",
    pill: "bg-status-danger-surface text-status-danger-ink",
    dot: "bg-status-danger-fill",
    activePill: "bg-status-danger-fill text-white",
  },
];

const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  REFERRAL: "Referral",
  LINKEDIN: "LinkedIn",
  JOB_PORTAL: "Job Portal",
  CAMPUS: "Campus",
  CAREERS_PAGE: "Careers Page",
  NAUKRI: "Naukri",
};

export function getStageConfig(status: CandidateStatus | null) {
  return STAGE_CONFIG.find((s) => s.value === status) ?? STAGE_CONFIG[0];
}

export function StagePillButton({
  stage,
  count,
  isActive,
  onFilter,
}: {
  stage: (typeof STAGE_CONFIG)[number];
  count: number;
  isActive: boolean;
  onFilter: (key: string, value: string) => void;
}) {
  function handleClick() {
    onFilter("status", stage.value);
  }
  return (
    <FilterPill
      active={isActive}
      dotClassName={stage.dot}
      activeClassName={cn(stage.activePill, "shadow-sm")}
      onClick={handleClick}
    >
      {stage.label} · {count}
    </FilterPill>
  );
}

export interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onEdit: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  onToggleSelect: (id: number, checked: boolean) => void;
  onStatusChange: (id: number, status: CandidateStatus) => void;
}

export function CandidateCard({
  candidate,
  isSelected,
  onEdit,
  onDelete,
  onToggleSelect,
  onStatusChange,
}: CandidateCardProps) {
  const cfg = getStageConfig(candidate.status);

  function handleStopPropagation(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }
  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    onToggleSelect(candidate.id, e.target.checked);
  }
  function handleEditClick() {
    onEdit(candidate);
  }
  function handleDeleteClick() {
    onDelete(candidate);
  }
  function handleStatusChange(v: string) {
    onStatusChange(candidate.id, v as CandidateStatus);
  }

  return (
    <div
      className={cn(
        "relative group rounded-lg border bg-card border-l-4 transition-shadow hover:shadow-md",
        cfg.accent,
        isSelected
          ? "border-primary/30 ring-2 ring-primary/20 shadow-sm"
          : "border-border/70",
      )}
    >
      <div
        className="absolute top-3 right-3 flex items-center gap-1 z-10"
        onClick={handleStopPropagation}
        onKeyDown={handleStopPropagation}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              aria-label="Candidate actions"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/hr/recruitment/candidates/${candidate.id}`} className="block p-3 pr-14">
        <div className="flex items-start gap-3 mb-2">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20">
            {getInitials(undefined, candidate.firstName, candidate.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <TruncatedText
              text={`${candidate.firstName} ${candidate.lastName}`}
              className="font-semibold text-sm text-foreground leading-tight"
            />
            {candidate.currentRole && (
              <TruncatedText
                text={`${candidate.currentRole}${candidate.currentCompany ? ` · ${candidate.currentCompany}` : ""}`}
                className="text-xs text-muted-foreground mt-0.5"
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <TruncatedText text={candidate.email} className="text-xs text-muted-foreground" />
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.source && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="font-medium text-foreground/80">{SOURCE_LABELS[candidate.source] ?? candidate.source}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded-full text-micro font-semibold", cfg.pill)}>
            {cfg.label}
          </span>
          {candidate.rating !== null && candidate.rating !== undefined && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < candidate.rating!
                      ? "text-status-warning-ink fill-amber-500"
                      : "text-border fill-transparent",
                  )}
                />
              ))}
            </div>
          )}
          {candidate.createdAt && (
            <div className="flex items-center gap-0.5 ml-auto text-micro text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </Link>

      <div
        className="px-3 pb-3 flex items-center gap-2"
        onClick={handleStopPropagation}
        onKeyDown={handleStopPropagation}
      >
        <AIScoreCandidateButton candidateId={candidate.id} compact />
        <Select value={candidate.status ?? "NEW"} onValueChange={handleStatusChange}>
          <SelectTrigger className="flex-1 text-xs bg-muted/40 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {STAGE_CONFIG.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dot)} />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CandidateCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card border-l-4 border-l-muted p-3 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}
