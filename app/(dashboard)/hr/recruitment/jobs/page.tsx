"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobPostings, useUpdateJobPosting, useDeleteJobPosting, useHrDepartments } from "@/lib/api/hooks/hr";
import { usePublishJobToBoards, useJobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import type { JobBoardPlatform, JobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, Play, Pause, Share2, Loader2, Copy, ExternalLink } from "lucide-react";
import type { JobPostingStatus } from "@/types/hr";
import { EmptyPersonIllustration } from "@/components/illustrations";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

const PLATFORM_ICONS: Record<string, string> = {
  LINKEDIN: "in",
  WHATSAPP: "wa",
  TWITTER: "𝕏",
};

function ShareJobDialog({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { data, isLoading } = useJobShareLinks(jobId);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied to clipboard"));
  };

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
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/40">
              <span className="flex-1 text-xs text-muted-foreground truncate">{data.directLink}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyLink(data.directLink)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share on</p>
            <div className="space-y-2">
              {data.shareLinks.map((link: JobShareLinks["shareLinks"][number]) => (
                <div key={link.platform} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">{PLATFORM_ICONS[link.platform] ?? link.platform[0]}</span>
                  <span className="flex-1 text-sm">{link.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(link.utmUrl)}>
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


export default function JobPostingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as JobPostingStatus | null;
  const visibilityFilter = searchParams.get("visibility");

  const { data: allJobs, isLoading } = useJobPostings(
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

  const handleDelete = useCallback(
    (id: number) => {
      deleteJob.mutate(id, {
        onSuccess: () => toast.success("Job posting deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteJob]
  );

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

  if (isLoading) {
    return (
      <PageWrapper title="Job Postings" subtitle="Manage open positions">
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

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
              <Plus className="mr-2 h-4 w-4" />New Job
            </Link>
          </Button>
        </div>
      }
      filters={
        <div className="flex items-center gap-2">
          <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={visibilityFilter ?? "ALL"} onValueChange={(v) => setFilter("visibility", v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              <SelectItem value="ALL">All Postings</SelectItem>
              <SelectItem value="external">External</SelectItem>
              <SelectItem value="internal">Internal Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!jobs?.length ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyPersonIllustration className="h-36 w-36 opacity-95" />
                      <p>No job postings yet.</p>
                    </div></TableCell></TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{job.title}</span>
                            {job.externalPostingIds && Object.keys(job.externalPostingIds as Record<string, string>).length > 0 && (
                              <div className="flex gap-1">
                                {Object.keys(job.externalPostingIds as Record<string, string>).map((platform) => (
                                  <Badge key={platform} variant="secondary" className="text-[9px] px-1 py-0 h-4 uppercase">{platform}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{departments?.find((d) => d.id === job.departmentId)?.name ?? "—"}</TableCell>
                        <TableCell>{job.location ?? "—"}</TableCell>
                        <TableCell className="text-sm">{job.type?.replaceAll("_", " ")}</TableCell>
                        <TableCell>{job.openings}</TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/hr/recruitment/jobs/${job.id}/edit`)}>
                                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </DropdownMenuItem>
                              {job.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "OPEN")}><Play className="mr-2 h-4 w-4" />Publish</DropdownMenuItem>
                              )}
                              {job.status === "OPEN" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handlePublish(job.id)}
                                    disabled={publishToBoards.isPending}
                                  >
                                    <Share2 className="mr-2 h-4 w-4" />Post to Job Boards
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setShareJobId(job.id)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />Share Job Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(job.id, "PAUSED")}><Pause className="mr-2 h-4 w-4" />Pause</DropdownMenuItem>
                                </>
                              )}
                              {job.status === "PAUSED" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "OPEN")}><Play className="mr-2 h-4 w-4" />Resume</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </PageWrapper>
    {shareJobId !== null && (
      <ShareJobDialog jobId={shareJobId} onClose={() => setShareJobId(null)} />
    )}
    </>
  );
}
