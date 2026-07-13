"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, Building2, Clock, Star, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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
    pill: "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-200",
    dot: "bg-muted-foreground/50",
    activePill: "bg-primary text-primary-foreground dark:bg-slate-100 dark:text-slate-800",
  },
  {
    value: "SCREENING",
    label: "Screening",
    accent: "border-l-blue-500",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
    activePill: "bg-blue-600 text-white",
  },
  {
    value: "INTERVIEW",
    label: "Interview",
    accent: "border-l-amber-500",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    activePill: "bg-amber-600 text-white",
  },
  {
    value: "OFFER",
    label: "Offer",
    accent: "border-l-violet-500",
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    dot: "bg-violet-500",
    activePill: "bg-violet-600 text-white",
  },
  {
    value: "HIRED",
    label: "Hired",
    accent: "border-l-emerald-500",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    activePill: "bg-emerald-600 text-white",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    accent: "border-l-rose-400",
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    dot: "bg-rose-400",
    activePill: "bg-rose-600 text-white",
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

export function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

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
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5",
        isActive ? stage.activePill + " shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isActive ? "bg-current opacity-70" : stage.dot)} />
      {stage.label} · {count}
    </button>
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

  function handleStopPropagation(e: React.MouseEvent) {
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
          ? "border-brand-core/30 ring-2 ring-brand-core/20 shadow-sm"
          : "border-border/70",
      )}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10" onClick={handleStopPropagation}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
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
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-gradient-to-br from-brand-core/20 to-brand-core/10 text-primary border border-brand-core/20">
            {getInitials(candidate.firstName, candidate.lastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
              {candidate.firstName} {candidate.lastName}
            </h3>
            {candidate.currentRole && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {candidate.currentRole}
                {candidate.currentCompany && ` · ${candidate.currentCompany}`}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{candidate.email}</span>
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
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", cfg.pill)}>
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
                      ? "text-amber-500 fill-amber-500"
                      : "text-border fill-transparent",
                  )}
                />
              ))}
            </div>
          )}
          {candidate.createdAt && (
            <div className="flex items-center gap-0.5 ml-auto text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true })}
            </div>
          )}
        </div>
      </Link>

      <div className="px-3 pb-3 flex items-center gap-2" onClick={handleStopPropagation}>
        <AIScoreCandidateButton candidateId={candidate.id} compact />
        <Select value={candidate.status ?? "NEW"} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-7 flex-1 text-xs bg-muted/40 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
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
