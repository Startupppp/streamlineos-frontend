"use client";

import { useCallback, useState } from "react";
import { useInterviews, useUpdateInterview } from "@/lib/api/hooks/hr";
import { useBulkRescheduleInterviews } from "@/lib/api/hooks/hr/recruitment";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import type { Interview, InterviewResult } from "@/types/hr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { format } from "date-fns";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";

function resultBadgeVariant(
  result: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  switch (result) {
    case "PASSED":
      return "default";
    case "FAILED":
      return "destructive";
    case "NO_SHOW":
      return "destructive";
    default:
      return "outline";
  }
}

export function InterviewList() {
  const { data: interviews } = useInterviews();
  const updateInterview = useUpdateInterview();
  const bulkReschedule = useBulkRescheduleInterviews();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkNewDate, setBulkNewDate] = useState("");
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);

  const handleResultChange = useCallback(
    (id: number, result: InterviewResult) => {
      updateInterview.mutate(
        { id, result },
        {
          onSuccess: () => toast.success("Interview result updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateInterview],
  );

  const handleBulkReschedule = useCallback(() => {
    if (!bulkNewDate) {
      toast.error("Select a new date first");
      return;
    }
    if (selectedIds.size === 0) return;
    bulkReschedule.mutate(
      {
        ids: Array.from(selectedIds),
        scheduledAt: new Date(bulkNewDate).toISOString(),
      },
      {
        onSuccess: (data) => {
          toast.success(
            `${data.rescheduled} interview${data.rescheduled !== 1 ? "s" : ""} rescheduled`,
          );
          setSelectedIds(new Set());
          setBulkNewDate("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [bulkNewDate, selectedIds, bulkReschedule]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!interviews) return;
    setSelectedIds((prev) =>
      prev.size === interviews.length
        ? new Set()
        : new Set(interviews.map((iv) => iv.id)),
    );
  }, [interviews]);

  function handleBulkDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBulkNewDate(e.target.value);
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
    setBulkNewDate("");
  }

  function handleFeedbackClose(open: boolean) {
    if (!open) setFeedbackInterview(null);
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 mb-2">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Input
              type="datetime-local"
              className="h-8 text-xs w-52"
              value={bulkNewDate}
              onChange={handleBulkDateChange}
              placeholder="New date & time"
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleBulkReschedule}
              disabled={bulkReschedule.isPending || !bulkNewDate}
            >
              {bulkReschedule.isPending ? "Rescheduling..." : "Reschedule Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          !!interviews?.length &&
                          selectedIds.size === interviews.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all interviews"
                      />
                    </TableHead>
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
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <EmptyCalendarIllustration className="h-36 w-36 opacity-95" />
                          <p>No interviews scheduled.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    interviews.map((interview) => (
                      <TableRow
                        key={interview.id}
                        className={selectedIds.has(interview.id) ? "bg-primary/5" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(interview.id)}
                            onCheckedChange={() => toggleSelect(interview.id)}
                            aria-label={`Select interview ${interview.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {interview.candidate?.firstName}{" "}
                          {interview.candidate?.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{interview.type}</Badge>
                            {(interview as Interview & { panelInterviewerIds?: string[] })
                              .panelInterviewerIds &&
                              (interview as Interview & { panelInterviewerIds?: string[] })
                                .panelInterviewerIds!.length > 1 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  Panel (
                                  {(interview as Interview & { panelInterviewerIds?: string[] })
                                    .panelInterviewerIds!.length}
                                  )
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(interview.scheduledAt), "PPp")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {interview.duration} min
                        </TableCell>
                        <TableCell>
                          <Badge variant={resultBadgeVariant(interview.result)}>
                            {interview.result}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setFeedbackInterview(interview as Interview)
                            }
                          >
                            Feedback
                          </Button>
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

      {feedbackInterview && (
        <InterviewFeedbackForm
          interview={feedbackInterview}
          open={feedbackInterview !== null}
          onOpenChange={handleFeedbackClose}
        />
      )}
    </>
  );
}
