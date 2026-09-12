"use client";

import { useState, useCallback } from "react";
import {
  CalendarClock,
  Plus,
} from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  useTasks,
  useCreateTask,
  useCompleteTask,
  type TaskType,
} from "@/hooks/api/tasks";
import { toast } from "sonner";
import { LeadFollowupList } from "./lead-followup-list";

const FOLLOW_UP_TYPES: { value: TaskType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Other" },
];

interface LeadFollowupTabProps {
  leadId: number;
}

export function LeadFollowupTab({ leadId }: LeadFollowupTabProps) {
  const [fuTitle, setFuTitle] = useState("");
  const [fuType, setFuType] = useState<TaskType>("CALL");
  const [fuDate, setFuDate] = useState("");
  const [fuTime, setFuTime] = useState("");
  const [fuNotes, setFuNotes] = useState("");

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const { data: leadTasksData, isLoading: tasksLoading } = useTasks({
    entityType: "LEAD",
    entityId: leadId,
    limit: 20,
  });

  const pendingTasks = (leadTasksData?.tasks ?? []).filter(
    (t) => t.status === "pending",
  );
  const doneTasks = (leadTasksData?.tasks ?? []).filter(
    (t) => t.status === "completed",
  );

  const handleScheduleFollowUp = useCallback(async () => {
    const title = fuTitle.trim();
    if (!title) {
      toast.error("Follow-up title is required");
      return;
    }
    if (!fuDate) {
      toast.error("Please pick a date");
      return;
    }

    const time = fuTime || "09:00";
    const dueDate = new Date(`${fuDate}T${time}:00`).toISOString();

    try {
      await createTask.mutateAsync({
        title,
        type: fuType,
        notes: fuNotes.trim() || undefined,
        entityType: "LEAD",
        entityId: leadId,
        dueDate,
      });
      toast.success("Follow-up scheduled");
      setFuTitle("");
      setFuDate("");
      setFuTime("");
      setFuNotes("");
      setFuType("CALL");
    } catch {
      toast.error("Failed to schedule follow-up");
    }
  }, [leadId, fuTitle, fuType, fuDate, fuTime, fuNotes, createTask]);

  const handleCompleteTask = useCallback(
    async (taskId: number) => {
      try {
        await completeTask.mutateAsync({ taskId });
        toast.success("Follow-up marked complete");
      } catch {
        toast.error("Failed to complete task");
      }
    },
    [completeTask],
  );

  const handleFuTypeChange = useCallback(
    (v: string) => {
      const next = FOLLOW_UP_TYPES.find((t) => t.value === v);
      if (next) setFuType(next.value);
    },
    [],
  );
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFuTitle(e.target.value), []);
  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFuTime(e.target.value), []);
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setFuNotes(e.target.value),
    [],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Plus className="h-3.5 w-3.5 text-primary" />
          Schedule Follow-up
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-dense text-muted-foreground">Title *</Label>
            <Input
              placeholder="e.g. Call to discuss SIP plan"
              value={fuTitle}
              onChange={handleTitleChange}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-dense text-muted-foreground">Type</Label>
            <Select value={fuType} onValueChange={handleFuTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-dense text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={fuTime}
              onChange={handleTimeChange}
              className="text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-dense text-muted-foreground">Date *</Label>
            <DatePicker
              value={fuDate}
              onChange={setFuDate}
              placeholder="Pick a date"
              fromDate={new Date()}
              className="text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-dense text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              placeholder="Any context for this follow-up..."
              value={fuNotes}
              onChange={handleNotesChange}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <LoadingButton
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={handleScheduleFollowUp}
          isPending={createTask.isPending}
          loadingText="Scheduling..."
        >
          <CalendarClock className="h-3.5 w-3.5" />
          Schedule Follow-up
        </LoadingButton>
      </div>

      <LeadFollowupList
        pendingTasks={pendingTasks}
        doneTasks={doneTasks}
        tasksLoading={tasksLoading}
        onCompleteTask={handleCompleteTask}
        isCompletePending={completeTask.isPending}
      />
    </div>
  );
}
