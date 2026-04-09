"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useJobPostings, useCreateJobPosting, useUpdateJobPosting, useDeleteJobPosting } from "@/lib/api/hooks/hr";
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
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Play, Pause } from "lucide-react";
import type { JobPostingStatus } from "@/types/hr";
import Image from "next/image";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("FULL_TIME");
  const [description, setDescription] = useState("");
  const [openings, setOpenings] = useState("1");

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
    createJob.mutate(
      {
        title: title.trim(),
        location: location || undefined,
        type,
        description: description || undefined,
        openings: Number(openings) || 1,
      },
      {
        onSuccess: () => {
          toast.success("Job posting created");
          setSheetOpen(false);
          setTitle("");
          setLocation("");
          setDescription("");
          setOpenings("1");
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

  if (isLoading) {
    return (
      <PageWrapper title="Job Postings" subtitle="Manage open positions">
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
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
                <label className="text-sm font-medium">Title</label>
                <Input placeholder="e.g. Senior React Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Openings</label>
                  <Input type="number" min="1" value={openings} onChange={(e) => setOpenings(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Job description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
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
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Openings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!jobs?.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <Image
                        src="/illustrations/undraw-online-survey.svg"
                        alt="Empty state illustration"
                        width={180}
                        height={140}
                        className="opacity-90"
                      />
                      <p>No job postings yet.</p>
                    </div></TableCell></TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.title}</TableCell>
                        <TableCell>{job.location ?? "—"}</TableCell>
                        <TableCell className="text-sm">{job.type?.replace("_", " ")}</TableCell>
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
                                <DropdownMenuItem onClick={() => handleStatusChange(job.id, "PAUSED")}><Pause className="mr-2 h-4 w-4" />Pause</DropdownMenuItem>
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
  );
}
