"use client";

import { useCallback } from "react";
import Link from "next/link";
import type { Resignation } from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInDays } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  XCircle,
  Undo2,
  FileText,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import { ProgressTimeline } from "./progress-timeline";
import { TruncatedText } from "@/components/ui/truncated-text";
import { viewProtectedFile } from "@/hooks/common/use-file-url";

function statusBadgeClass(status: string | null): string {
  if (!status)
    return "bg-muted text-muted-foreground border-border";
  if (status === "SUBMITTED" || status === "PENDING_HR")
    return "bg-status-info-surface text-status-info-ink border-status-info-rule";
  if (status === "HR_APPROVED")
    return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  if (
    status === "FINAL_APPROVED" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED" ||
    status === "APPROVED"
  )
    return "bg-status-success-surface text-status-success-ink border-status-success-rule";
  if (status === "REJECTED" || status === "WITHDRAWN")
    return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
  return "bg-muted text-muted-foreground border-border";
}

interface ResignationCardProps {
  resignation: Resignation;
  isExpanded: boolean;
  isAdmin: boolean;
  isHR: boolean;
  canApproveExit: boolean;
  userId: string | undefined;
  onToggleExpand: (id: number) => void;
  onHrApprove: (id: number) => void;
  onHrReject: (id: number) => void;
  onFinalApprove: (id: number) => void;
  onFinalReject: (id: number) => void;
  onWithdraw: (id: number) => void;
  onViewLetter?: (id: number) => void;
}

export function ResignationCard({
  resignation: r,
  isExpanded,
  isAdmin,
  isHR,
  canApproveExit,
  userId,
  onToggleExpand,
  onHrApprove,
  onHrReject,
  onFinalApprove,
  onFinalReject,
  onWithdraw,
  onViewLetter,
}: ResignationCardProps) {
  const daysLeft = r.lastWorkingDate
    ? differenceInDays(new Date(r.lastWorkingDate), new Date())
    : null;
  const isOwnRecord = r.userId === userId;
  const canWithdraw =
    !isAdmin &&
    isOwnRecord &&
    (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  const hrCanAct =
    isHR && (r.status === "SUBMITTED" || r.status === "PENDING_HR");
  const finalCanAct = canApproveExit && r.status === "HR_APPROVED";

  const handleToggle = useCallback(
    () => onToggleExpand(r.id),
    [r.id, onToggleExpand],
  );
  const handleWithdraw = useCallback(
    () => onWithdraw(r.id),
    [r.id, onWithdraw],
  );
  const handleViewLetter = useCallback(
    () => onViewLetter?.(r.id),
    [r.id, onViewLetter],
  );
  const handleViewUploadedLetter = useCallback(() => {
    void viewProtectedFile(`/hr/exit/${r.id}/file`);
  }, [r.id]);

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden border-l-4 border-l-rose-400">
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
          <AvatarFallback className="text-xs font-semibold bg-status-danger-surface text-status-danger-ink">
            {r.user?.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TruncatedText
              text={r.user?.name ?? "Employee"}
              className="text-sm font-semibold"
            />
            <Badge
              variant="outline"
              className={cn(
                "text-micro font-semibold px-2 py-0.5 rounded-full",
                statusBadgeClass(r.status),
              )}
            >
              {r.status}
            </Badge>
            {r.reasonCategory && (
              <Badge
                variant="outline"
                className="text-micro font-semibold hidden sm:inline-flex bg-muted text-muted-foreground border-border"
              >
                {r.reasonCategory}
              </Badge>
            )}
            {r.noticePeriodDays && (
              <Badge
                variant="outline"
                className="text-micro font-semibold hidden sm:inline-flex bg-primary/10 text-primary border-primary/20"
              >
                {r.noticePeriodDays}d notice
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-micro text-muted-foreground mt-0.5 flex-wrap">
            {r.lastWorkingDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                LWD: {format(new Date(r.lastWorkingDate), "MMM d, yyyy")}
              </span>
            )}
            {daysLeft !== null && daysLeft > 0 && (
              <span className="flex items-center gap-1 text-status-warning-ink font-medium">
                <Clock className="h-3 w-3" />
                {daysLeft} days left
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hrCanAct && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onHrApprove(r.id)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onHrReject(r.id)}
              >
                <XCircle className="h-3 w-3" />
                Reject
              </Button>
            </>
          )}

          {finalCanAct && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200"
                onClick={() => onFinalApprove(r.id)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 duration-200 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => onFinalReject(r.id)}
              >
                <XCircle className="h-3 w-3" />
                Reject
              </Button>
            </>
          )}

          {canWithdraw && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5 duration-200"
              onClick={handleWithdraw}
            >
              <Undo2 className="h-3 w-3" />
              Withdraw
            </Button>
          )}

          {r.hasResignationLetter && (
            <button
              type="button"
              onClick={handleViewUploadedLetter}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
              title="View uploaded resignation letter"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Letter</span>
            </button>
          )}

          {onViewLetter && (
            <Button
              size="sm"
              variant="ghost"
              className="w-7 p-0 duration-200"
              aria-label="View generated resignation letter"
              onClick={handleViewLetter}
              title="View generated resignation letter"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 duration-200">
            <Link href={`/hr/exit/${r.id}`}>
              <ListChecks className="h-3 w-3" />
              Checklist
            </Link>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-7 p-0 duration-200"
            aria-label={isExpanded ? "Collapse progress" : "Expand progress"}
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>

      {isExpanded && (
        <div className="border-t border-border bg-muted/20">
          <ProgressTimeline id={r.id} />
        </div>
      )}
    </Card>
  );
}
