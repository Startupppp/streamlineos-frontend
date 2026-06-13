"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobPostings, useCreateJobPosting, useUpdateJobPosting, useDeleteJobPosting, useHrDepartments } from "@/lib/api/hooks/hr";
import { usePublishJobToBoards, useJobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import type { JobBoardPlatform, JobShareLinks } from "@/lib/api/hooks/hr/recruitment";
import { useGenerateJobDescription } from "@/lib/api/hooks/ai";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
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
import { Plus, MoreHorizontal, Trash2, Play, Pause, Share2, Sparkles, Loader2, Copy, ExternalLink } from "lucide-react";
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

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "OPEN": return "default";
    case "DRAFT": return "secondary";
    case "PAUSED": return "outline";
    case "CLOSED": case "FILLED": return "destructive";
    default: return "secondary";
  }
}

export default function JobPostingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") as JobPostingStatus | null;

  const { data: jobs, isLoading } = useJobPostings(
    statusFilter ? { status: statusFilter } : undefined
  );
  const createJob = useCreateJobPosting();
  const updateJob = useUpdateJobPosting();
  const deleteJob = useDeleteJobPosting();
  const publishToBoards = usePublishJobToBoards();
  const generateJd = useGenerateJobDescription();

  const { data: departments } = useHrDepartments();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareJobId, setShareJobId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("FULL_TIME");
  const [description, setDescription] = useState("");
  const [openings, setOpenings] = useState("1");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [requirements, setRequirements] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const sm = salaryMin ? Number(salaryMin) : undefined;
    const sx = salaryMax ? Number(salaryMax) : undefined;
    if (sm && sx && sm > sx) { toast.error("Salary min must be ≤ max"); return; }
    createJob.mutate(
      {
        title: title.trim(),
        departmentId: departmentId ? Number(departmentId) : undefined,
        location: location || undefined,
        type,
        description: description || undefined,
        openings: Number(openings) || 1,
        salaryMin: sm,
        salaryMax: sx,
        requirements: requirements.trim() || undefined,
        applicationDeadline: applicationDeadline || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Job posting created");
          setSheetOpen(false);
          setTitle(""); setDepartmentId(""); setLocation(""); setDescription(""); setOpenings("1");
          setSalaryMin(""); setSalaryMax(""); setRequirements(""); setApplicationDeadline("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [title, location, type, description, openings, createJob]);

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
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New Job</Button></SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Create Job Posting</SheetTitle>
              <SheetDescription className="text-xs">Add a new position to recruit for.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Senior React Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input placeholder="e.g. Mumbai, Remote" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="INTERNSHIP">Internship</SelectItem>
                      <SelectItem value="FREELANCE">Freelance</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      <SelectItem value="CONSULTANT">Consultant</SelectItem>
                      <SelectItem value="APPRENTICESHIP">Apprenticeship</SelectItem>
                      <SelectItem value="COMMISSION_BASED">Commission-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Openings</label>
                  <Input type="number" min="1" value={openings} onChange={(e) => setOpenings(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Description</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 gap-1 text-primary"
                    disabled={!title.trim() || generateJd.isPending}
                    onClick={() => {
                      if (!title.trim()) return;
                      generateJd.mutate(
                        {
                          title: title.trim(),
                          requirements: requirements || undefined,
                          location: location || undefined,
                          type,
                          salaryMin: salaryMin ? Number(salaryMin) : undefined,
                          salaryMax: salaryMax ? Number(salaryMax) : undefined,
                        },
                        {
                          onSuccess: (data) => {
                            setDescription(data.description);
                            toast.success("Job description generated");
                          },
                          onError: (e) => toast.error(getErrorMessage(e)),
                        }
                      );
                    }}
                  >
                    {generateJd.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {generateJd.isPending ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
                <Textarea placeholder="Job description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Min Salary (₹)</label>
                  <Input type="number" min="0" placeholder="e.g. 600000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Salary (₹)</label>
                  <Input type="number" min="0" placeholder="e.g. 1200000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Requirements</label>
                <Textarea placeholder="• 3+ years React experience&#10;• Strong TypeScript skills" value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Application Deadline</label>
                <Input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} />
              </div>
            </div>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={createJob.isPending}>
                {createJob.isPending ? "Creating..." : "Create Job"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        </div>
      }
      filters={
        <Select value={statusFilter ?? "ALL"} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                        <TableCell><Badge variant={statusBadgeVariant(job.status)}>{job.status}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
