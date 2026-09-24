"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Send,
  Briefcase,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilterPill } from "@/components/ui/filter-pill";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { JobRequisition } from "@/hooks/api/hr/requisitions";

export const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  HIGH: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  URGENT: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

/**
 * The five statuses a requisition can actually hold.
 *
 * `PUBLISHED` and `CLOSED` were in here and are not in the backend's
 * `REQUISITION_STATUSES` — a requisition is never published, a job posting is,
 * and there is no CLOSED transition. `FILLED` was missing, which is the one a
 * requisition reaches on its own: the last opening on its job going means the
 * hire marks it FILLED, and that outcome was falling through this map onto the
 * DRAFT-shaped fallback.
 */
export const STATUS_STYLES: Record<string, { badge: string; label: string; dot: string }> = {
  DRAFT: { badge: "bg-muted text-muted-foreground border-border", label: "Draft", dot: "bg-muted-foreground/50" },
  PENDING_APPROVAL: { badge: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule", label: "Pending Approval", dot: "bg-status-warning-fill" },
  APPROVED: { badge: "bg-status-success-surface text-status-success-ink border-status-success-rule", label: "Approved", dot: "bg-status-success-fill" },
  FILLED: { badge: "bg-status-info-surface text-status-info-ink border-status-info-rule", label: "Filled", dot: "bg-status-info-fill" },
  REJECTED: { badge: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule", label: "Rejected", dot: "bg-status-danger-fill" },
};

export const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Filled", value: "FILLED" },
  { label: "Rejected", value: "REJECTED" },
];

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
};

export function RequisitionCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export interface RequisitionCardProps {
  req: JobRequisition;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onConvertToJob: (id: number) => void;
  isSubmitting: boolean;
  isApproving: boolean;
  isConverting: boolean;
  canManage: boolean;
}

export function RequisitionCard({
  req,
  onSubmit,
  onApprove,
  onReject,
  onConvertToJob,
  isSubmitting,
  isApproving,
  isConverting,
  canManage,
}: RequisitionCardProps) {
  const statusStyle = STATUS_STYLES[req.status] ?? STATUS_STYLES.DRAFT;
  const priorityStyle = PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.MEDIUM;
  const alreadyConverted = !!req.linkedJobId;

  function handleSubmitClick() {
    onSubmit(req.id);
  }

  function handleApproveClick() {
    onApprove(req.id);
  }

  function handleRejectClick() {
    onReject(req.id);
  }

  function handleConvertToJob() {
    onConvertToJob(req.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group relative rounded-2xl border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2 w-2 rounded-full shrink-0", statusStyle.dot)} />
              <TruncatedText text={req.title} className="text-sm font-semibold text-foreground" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {req.department && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {req.department}
                </span>
              )}
              {req.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {req.location}
                </span>
              )}
            </div>
          </div>

          {canManage && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton
                icon={EllipsisIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Requisition actions"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {req.status === "DRAFT" && (
                <>
                  <DropdownMenuItem onClick={handleSubmitClick} disabled={isSubmitting}>
                    <Send className="mr-2 h-3.5 w-3.5" /> Submit for Approval
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {req.status === "PENDING_APPROVAL" && (
                <>
                  <DropdownMenuItem onClick={handleApproveClick} disabled={isApproving}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-status-success-ink" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleRejectClick}>
                    <XCircle className="mr-2 h-3.5 w-3.5" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {req.status === "APPROVED" && !alreadyConverted && (
                <>
                  <DropdownMenuItem onClick={handleConvertToJob} disabled={isConverting}>
                    <Briefcase className="mr-2 h-3.5 w-3.5" /> Convert to Job Posting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={cn("inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border", statusStyle.badge)}>
            {statusStyle.label}
          </span>
          <span className={cn("inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border", priorityStyle)}>
            {req.priority}
          </span>
          <span className="inline-flex items-center text-micro font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {TYPE_LABELS[req.type] ?? req.type}
          </span>
        </div>

        {req.status === "REJECTED" && req.rejectionReason && (
          <p className="text-xs text-status-danger-ink bg-status-danger-surface rounded-lg px-3 py-2 mb-3 line-clamp-2">
            {req.rejectionReason}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="font-semibold text-foreground">{req.headcount}</span> hires
            </span>
            {(req.budgetMin || req.budgetMax) && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {req.budgetMin && req.budgetMax
                  ? `${Number(req.budgetMin).toLocaleString()} – ${Number(req.budgetMax).toLocaleString()}`
                  : req.budgetMin
                  ? `From ${Number(req.budgetMin).toLocaleString()}`
                  : `Up to ${Number(req.budgetMax).toLocaleString()}`}
              </span>
            )}
            {req.targetDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {req.targetDate}
              </span>
            )}
          </div>

          {canManage && <div className="flex items-center gap-1.5 shrink-0">
            {req.status === "DRAFT" && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleSubmitClick}
                isPending={isSubmitting}
                loadingText="Submitting…"
              >
                <Send className="mr-1 h-3 w-3" />
                Submit
              </LoadingButton>
            )}
            {req.status === "PENDING_APPROVAL" && (
              <>
                <LoadingButton
                  size="sm"
                  variant="outline"
                  className="text-xs border-status-success-rule text-status-success-ink hover:bg-status-success-surface"
                  onClick={handleApproveClick}
                  isPending={isApproving}
                  loadingText="Approving…"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Approve
                </LoadingButton>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={handleRejectClick}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </>
            )}
            {req.status === "APPROVED" && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleConvertToJob}
                disabled={alreadyConverted}
                isPending={isConverting}
                loadingText="Creating…"
              >
                <Briefcase className="mr-1 h-3 w-3" />
                {alreadyConverted ? "Job Created" : "Create Job"}
              </LoadingButton>
            )}
          </div>}
        </div>
      </div>
    </motion.div>
  );
}

interface StatusTabButtonProps {
  label: string;
  value: string | undefined;
  activeStatus: string | undefined;
  onSelect: (value: string | undefined) => void;
}

export function StatusTabButton({ label, value, activeStatus, onSelect }: StatusTabButtonProps) {
  function handleClick() {
    onSelect(value);
  }
  return (
    <FilterPill active={activeStatus === value} onClick={handleClick}>
      {label}
    </FilterPill>
  );
}
