"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobPostings, useUpdateJobPosting, useDeleteJobPosting, useHrDepartments } from "@/hooks/api/hr";
import { usePublishJobToBoards, useJobShareLinks } from "@/hooks/api/hr/recruitment";
import type { JobBoardPlatform, JobShareLinks } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Trash2, Play, Pause, Share2, Loader2, Copy,
  ExternalLink, MapPin, Users, Briefcase, Building2, Pencil,
} from "lucide-react";
import type { JobPostingStatus } from "@/types/hr";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

const STATUS_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  OPEN: { dot: "bg-emerald-500", label: "Open", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  DRAFT: { dot: "bg-slate-400", label: "Draft", badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  PAUSED: { dot: "bg-amber-500", label: "Paused", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  CLOSED: { dot: "bg-rose-400", label: "Closed", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  FILLED: { dot: "bg-blue-500", label: "Filled", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

const PLATFORM_ICONS: Record<string, string> = {
  LINKEDIN: "in",
  WHATSAPP: "wa",
  TWITTER: "𝕏",
};

function ShareJobDialog({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data, isLoading } = useJobShareLinks(jobId);

  function handleCopyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied to clipboard"));
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Share Job Posting</DialogTitle>
          <DialogDescription className="text-xs">
            Share this job on social platforms with UTM tracking.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-muted/40">
              <span className="flex-1 text-xs text-muted-foreground truncate">{data.directLink}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCopyLink(data.directLink)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share on</p>
            <div className="space-y-2">
              {data.shareLinks.map((link: JobShareLinks["shareLinks"][number]) => (
                <div key={link.platform} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{PLATFORM_ICONS[link.platform] ?? link.platform[0]}</span>
                  <span className="flex-1 text-sm font-medium">{link.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyLink(link.utmUrl)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Could not load share links.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
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
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export default function JobPostingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as JobPostingStatus | null;
  const visibilityFilter = searchParams.get("visibility");

  const { data: allJobs, isLoading, isError, refetch } = useJobPostings(
    statusFilter ? { status: statusFilter } : undefined
  );

  const jobs = allJobs?.filter((job) => {
    if (visibilityFilter === "internal") return job.isInternal === true;
    if (visibilityFilter === "external") return !job.isInternal;
    return true;
  });

  const updateJob = useUpdateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const publishToBoards = usePublishJobToBoards();
  const { data: departments } = useHrDepartments();

  const [shareJobId, setShareJobId] = useState<number | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleStatusChange = useCallback(
    (id: number, status: JobPostingStatus) => {
      updateJob.mutate({ id, status }, {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [updateJob]
  );

  const handleDelete = useCallback(() => {
    if (!deleteJobId) return;
    deleteJob.mutate(deleteJobId, {
      onSuccess: () => {
        toast.success("Job posting deleted");
        setDeleteJobId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteJobId, deleteJob]);

  const handlePublish = useCallback(
    (id: number) => {
      const platforms: JobBoardPlatform[] = ["LINKEDIN", "NAUKRI", "INDEED"];
      publishToBoards.mutate({ jobId: id, platforms }, {
        onSuccess: (data) => {
          if (data.publishedCount > 0) {
            toast.success(`Posted to ${data.publishedCount} platform${data.publishedCount !== 1 ? "s" : ""}`);
          } else {
            toast.error("No connected platforms available. Configure integrations in Settings.");
          }
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [publishToBoards]
  );

  return (
    <>
      <PageWrapper
        title="Job Postings"
        subtitle="Manage open positions"
        badge={`${jobs?.length ?? 0} jobs`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/recruitment">Back</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/hr/recruitment/jobs/new">
                <Plus className="mr-1.5 h-4 w-4" /> New Job
              </Link>
            </Button>
          </div>
        }
        filters={
          <div className="flex items-center gap-2">
            <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter ?? "ALL"} onValueChange={(v) => setFilter("visibility", v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="ALL">All Postings</SelectItem>
                <SelectItem value="external">External</SelectItem>
                <SelectItem value="internal">Internal Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load job postings</p>
            <p className="text-xs text-muted-foreground">An error occurred while fetching data.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : !jobs?.length ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <EmptyPersonIllustration className="h-28 w-28 opacity-90" />
            <div>
              <p className="text-sm font-semibold text-foreground">No job postings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first job posting to start hiring</p>
            </div>
            <Button size="sm" asChild>
              <Link href="/hr/recruitment/jobs/new">
                <Plus className="mr-1.5 h-4 w-4" /> New Job Posting
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const statusStyle = (job.status && STATUS_STYLES[job.status]) || STATUS_STYLES.DRAFT;
              const deptName = departments?.find((d) => d.id === job.departmentId)?.name;
              const externalPlatforms = job.externalPostingIds ? Object.keys(job.externalPostingIds) : [];

              return (
                <div
                  key={job.id}
                  className="group relative rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("h-2 w-2 rounded-full shrink-0", statusStyle.dot)} />
                          <h3 className="text-sm font-semibold text-foreground truncate">{job.title}</h3>
                        </div>
                        {deptName && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{deptName}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => router.push(`/hr/recruitment/jobs/${job.id}/edit`)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {job.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "OPEN")}>
                              <Play className="mr-2 h-3.5 w-3.5" /> Publish
                            </DropdownMenuItem>
                          )}
                          {job.status === "OPEN" && (
                            <>
                              <DropdownMenuItem onClick={() => handlePublish(job.id)} disabled={publishToBoards.isPending}>
                                <Share2 className="mr-2 h-3.5 w-3.5" /> Post to Job Boards
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShareJobId(job.id)}>
                                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Share Job Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(job.id, "PAUSED")}>
                                <Pause className="mr-2 h-3.5 w-3.5" /> Pause
                              </DropdownMenuItem>
                            </>
                          )}
                          {job.status === "PAUSED" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "OPEN")}>
                              <Play className="mr-2 h-3.5 w-3.5" /> Resume
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteJobId(job.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyle.badge)}>
                        {statusStyle.label}
                      </span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {job.location}
                        </span>
                      )}
                      {job.type && (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {job.type.replace(/_/g, " ")}
                        </span>
                      )}
                      {job.isInternal && (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        asChild
                      >
                        <Link href={`/hr/recruitment/jobs/${job.id}/edit`}>
                          <Briefcase className="h-3 w-3" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageWrapper>

      {shareJobId !== null && (
        <ShareJobDialog jobId={shareJobId} onClose={() => setShareJobId(null)} />
      )}
      <ConfirmDialog
        open={deleteJobId !== null}
        onOpenChange={(open) => { if (!open) setDeleteJobId(null); }}
        title="Delete job posting?"
        description="This will permanently delete this job posting and all related data. This cannot be undone."
        confirmLabel={deleteJob.isPending ? "Deleting…" : "Delete Job Posting"}
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
