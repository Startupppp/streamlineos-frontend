"use client";

import { useState, useCallback } from "react";
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  CalendarClock,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  useTasks,
  useCreateTask,
  useCompleteTask,
  type TaskType,
} from "@/hooks/api/tasks";
import { toast } from "sonner";

const FOLLOW_UP_TYPES: { value: TaskType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "CUSTOM", label: "Other" },
];

function formatTaskDue(dueDate: string | null): string {
  if (!dueDate) return "No date";
  const d = new Date(dueDate);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  const formatted = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  if (diffDays < 0) return `Overdue · ${formatted}`;
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  return `${formatted} · ${time}`;
}

interface CompleteTaskButtonProps {
  taskId: number;
  onComplete: (taskId: number) => void;
  isPending: boolean;
}

function CompleteTaskButton({
  taskId,
  onComplete,
  isPending,
}: CompleteTaskButtonProps) {
  const handleClick = useCallback(
    () => onComplete(taskId),
    [taskId, onComplete],
  );
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-emerald-400"
      onClick={handleClick}
      disabled={isPending}
      title="Mark as done"
    >
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  );
}

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
  const { data: leadTasksData } = useTasks({
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
    (v: string) => setFuType(v as TaskType),
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
            <Label className="text-[11px] text-muted-foreground">Title *</Label>
            <Input
              placeholder="e.g. Call to discuss SIP plan"
              value={fuTitle}
              onChange={handleTitleChange}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Type</Label>
            <Select value={fuType} onValueChange={handleFuTypeChange}>
              <SelectTrigger className="h-8 text-xs">
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
            <Label className="text-[11px] text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={fuTime}
              onChange={handleTimeChange}
              className="h-8 text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Date *</Label>
            <DatePicker
              value={fuDate}
              onChange={setFuDate}
              placeholder="Pick a date"
              fromDate={new Date()}
              className="h-8 text-xs"
            />
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">
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

        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5"
          onClick={handleScheduleFollowUp}
          disabled={createTask.isPending}
        >
          {createTask.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarClock className="h-3.5 w-3.5" />
          )}
          Schedule Follow-up
        </Button>
      </div>

      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pending ({pendingTasks.length})
          </p>
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const isOverdue =
                task.dueDate && new Date(task.dueDate) < new Date();
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/40"
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                      task.type === "CALL"
                        ? "bg-blue-500/15 text-blue-400"
                        : task.type === "EMAIL"
                          ? "bg-blue-500/15 text-blue-400"
                          : task.type === "MEETING"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {task.type === "CALL" ? (
                      <Phone className="h-3.5 w-3.5" />
                    ) : task.type === "EMAIL" ? (
                      <Mail className="h-3.5 w-3.5" />
                    ) : task.type === "MEETING" ? (
                      <Calendar className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">
                      {task.title}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] mt-0.5",
                        isOverdue
                          ? "text-red-400 font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatTaskDue(task.dueDate)}
                    </p>
                    {task.notes && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                        {task.notes}
                      </p>
                    )}
                  </div>
                  <CompleteTaskButton
                    taskId={task.id}
                    onComplete={handleCompleteTask}
                    isPending={completeTask.isPending}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Completed ({doneTasks.length})
          </p>
          <div className="space-y-1.5">
            {doneTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/10 border border-border/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-muted-foreground/70 line-through truncate flex-1">
                  {task.title}
                </span>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                  {task.completedAt
                    ? new Date(task.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingTasks.length === 0 && doneTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground/50">
          <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No follow-ups yet</p>
          <p className="text-[11px] mt-0.5">
            Schedule one above to stay on track
          </p>
        </div>
      )}
    </div>
  );
}
