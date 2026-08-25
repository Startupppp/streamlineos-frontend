"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EllipsisIcon } from "@animateicons/react/lucide";
import {
  Trash2,
  Play,
  Pause,
  Share2,
  ExternalLink,
  MapPin,
  Users,
  Briefcase,
  Building2,
  Pencil,
  ListChecks,
  CopyPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "./job-posting-constants";
import type { JobPosting, JobPostingStatus } from "@/types/hr";

export interface JobCardProps {
  job: JobPosting;
  deptName: string | undefined;
  isPublishPending: boolean;
  isDuplicatePending: boolean;
  onStatusChange: (id: number, status: JobPostingStatus) => void;
  onPublish: (id: number) => void;
  onShare: (id: number) => void;
  onTrackBoards: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export function JobCard({
  job,
  deptName,
  isPublishPending,
  isDuplicatePending,
  onStatusChange,
  onPublish,
  onShare,
  onTrackBoards,
  onDuplicate,
  onDelete,
}: JobCardProps) {
  const statusStyle = (job.status && STATUS_STYLES[job.status]) || STATUS_STYLES.DRAFT;
  const externalPlatforms = job.externalPostingIds ? Object.keys(job.externalPostingIds) : [];

  function handlePublishOpen() { onStatusChange(job.id, "OPEN"); }
  function handlePublishToBoards() { onPublish(job.id); }
  function handleShare() { onShare(job.id); }
  function handleTrackBoards() { onTrackBoards(job.id); }
  function handlePause() { onStatusChange(job.id, "PAUSED"); }
  function handleResume() { onStatusChange(job.id, "OPEN"); }
  function handleClose() { onStatusChange(job.id, "CLOSED"); }
  function handleReopen() { onStatusChange(job.id, "OPEN"); }
  function handleDuplicate() { onDuplicate(job.id); }
  function handleDelete() { onDelete(job.id); }

  return (
    <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2 w-2 rounded-full shrink-0", statusStyle.dot)} />
              <TruncatedText text={job.title} className="text-sm font-semibold text-foreground" />
            </div>
            {deptName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <TruncatedText text={deptName} />
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AnimatedIconButton
                icon={EllipsisIcon}
                iconSize={16}
                variant="ghost"
                size="icon"
                className="w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                aria-label="Job actions"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/hr/recruitment/jobs/${job.id}/edit`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicatePending}>
                <CopyPlus className="mr-2 h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {job.status === "DRAFT" && (
                <DropdownMenuItem onClick={handlePublishOpen}>
                  <Play className="mr-2 h-3.5 w-3.5" /> Publish
                </DropdownMenuItem>
              )}
              {job.status === "OPEN" && (
                <>
                  <DropdownMenuItem onClick={handlePublishToBoards} disabled={isPublishPending}>
                    <Share2 className="mr-2 h-3.5 w-3.5" /> Post to Job Boards
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Share Job Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleTrackBoards}>
                    <ListChecks className="mr-2 h-3.5 w-3.5" /> Track External Postings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePause}>
                    <Pause className="mr-2 h-3.5 w-3.5" /> Pause
                  </DropdownMenuItem>
                </>
              )}
              {job.status === "PAUSED" && (
                <>
                  <DropdownMenuItem onClick={handleResume}>
                    <Play className="mr-2 h-3.5 w-3.5" /> Resume
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClose}>
                    Close Job
                  </DropdownMenuItem>
                </>
              )}
              {job.status === "OPEN" && (
                <DropdownMenuItem onClick={handleClose}>
                  Close Job
                </DropdownMenuItem>
              )}
              {(job.status === "CLOSED" || job.status === "FILLED") && (
                <DropdownMenuItem onClick={handleReopen}>
                  <Play className="mr-2 h-3.5 w-3.5" /> Reopen
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full", statusStyle.badge)}>
            {statusStyle.label}
          </span>
          {job.location && (
            <span className="inline-flex items-center gap-1 text-micro font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {job.location}
            </span>
          )}
          {job.type && (
            <span className="inline-flex items-center text-micro font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {job.type.replace(/_/g, " ")}
            </span>
          )}
          {job.isInternal && (
            <span className="inline-flex items-center text-micro font-medium px-2 py-0.5 rounded-full bg-primary/10 text-foreground">
              Internal
            </span>
          )}
          {externalPlatforms.map((platform) => (
            <Badge key={platform} variant="secondary" className="text-[9px] px-1 py-0 h-4 uppercase">{platform}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="font-semibold text-foreground">{job.openings}</span>
            <span>opening{job.openings !== 1 ? "s" : ""}</span>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
            <Link href={`/hr/recruitment/jobs/${job.id}/edit`}>
              <Briefcase className="h-3 w-3" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>
    </div>
  );
}
