"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useInterviews, useCreateInterview, useUpdateInterview, useCandidates } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Plus, Video, Phone, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { InterviewType, InterviewResult } from "@/types/hr";

function resultBadgeVariant(result: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (result) {
    case "PASSED": return "default";
    case "FAILED": return "destructive";
    case "NO_SHOW": return "destructive";
    default: return "outline";
  }
}

export default function InterviewsPage() {
  const { data: interviews, isLoading } = useInterviews();
  const { data: allCandidates } = useCandidates();
  const createInterview = useCreateInterview();
  const updateInterview = useUpdateInterview();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [type, setType] = useState<InterviewType>("VIDEO");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");

  const handleCreate = useCallback(() => {
    if (!candidateId || !scheduledAt) {
      toast.error("Candidate and scheduled date are required");
      return;
    }
    createInterview.mutate(
      {
        candidateId: Number(candidateId),
        type,
        scheduledAt,
        duration: Number(duration) || 60,
        meetingLink: meetingLink || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          setSheetOpen(false);
          setCandidateId("");
          setScheduledAt("");
          setMeetingLink("");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }, [candidateId, type, scheduledAt, duration, meetingLink, createInterview]);

  const handleResultChange = useCallback(
    (id: number, result: InterviewResult) => {
      updateInterview.mutate({ id, result }, {
        onSuccess: () => toast.success("Interview result updated"),
        onError: (e) => toast.error(e.message),
      });
    },
    [updateInterview]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Interviews" subtitle="Schedule and track interviews">
        <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Interviews"
      subtitle="Schedule and track interviews"
      badge={`${interviews?.length ?? 0} interviews`}
      actions={
        <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/recruitment">Back</Link>
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Schedule Interview</Button></SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Schedule Interview</SheetTitle>
              <SheetDescription className="text-xs">Set up an interview with a candidate.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Candidate</label>
                <Select value={candidateId} onValueChange={setCandidateId}>
                  <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                  <SelectContent>
                    {allCandidates?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={type} onValueChange={(v) => setType(v as InterviewType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"] as InterviewType[]).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (min)</label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date & Time</label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Meeting Link</label>
                <Input placeholder="https://meet.google.com/..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} />
              </div>
            </div>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={createInterview.isPending}>
                {createInterview.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!interviews?.length ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No interviews scheduled.</TableCell></TableRow>
                  ) : (
                    interviews.map((interview) => (
                      <TableRow key={interview.id}>
                        <TableCell className="font-medium">
                          {interview.candidate?.firstName} {interview.candidate?.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{interview.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(interview.scheduledAt), "PPp")}
                        </TableCell>
                        <TableCell className="text-sm">{interview.duration} min</TableCell>
                        <TableCell>
                          <Badge variant={resultBadgeVariant(interview.result)}>
                            {interview.result}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={interview.result ?? "PENDING"}
                            onValueChange={(v) => handleResultChange(interview.id, v as InterviewResult)}
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(["PENDING", "PASSED", "FAILED", "NO_SHOW"] as InterviewResult[]).map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
