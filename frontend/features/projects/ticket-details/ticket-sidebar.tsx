"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Clock,
  User,
  Calendar,
  Circle,
  Timer,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Boxes,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { useEpics, useModules } from "@/hooks/api/projects";
import { LabelPicker } from "../tickets/label-picker";
import type { ProjectMember } from "./types";

interface DisplayedAssignee {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface TicketSidebarProps {
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    sprintId?: number | null;
    epicId?: number | null;
    moduleId?: number | null;
    startDate?: string | null;
    dueDate?: string | null;
    timeSpent?: string | null;
    originalEstimate?: string | null;
    link?: string | null;
    labels?: Array<{
      label?: { id: number; name: string; color: string | null } | null;
    }>;
    assignees?: Array<{
      userId: string;
      user?: {
        firstName?: string | null;
        lastName?: string | null;
        image?: string | null;
      } | null;
    }>;
    assignee?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
    } | null;
    reporter?: {
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  };
  ticketId: number;
  projectId?: number;
  members: ProjectMember[];
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
}

interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
}

function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2 min-h-[36px]">
      <span className="text-xs text-muted-foreground font-medium truncate">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketSidebar({
  ticket,
  ticketId,
  projectId,
  members,
  sprints,
  statuses,
  onAutoSave,
}: TicketSidebarProps) {
  const { data: epics } = useEpics(projectId ?? 0);
  const { data: modules } = useModules(projectId ?? 0);
  const selectableEpics = (epics ?? []).filter((e) => e.id !== ticket.id);

  const handleStartDateChange = (value: string) =>
    onAutoSave({ startDate: value || null });
  const handleDueDateChange = (value: string) =>
    onAutoSave({ dueDate: value || null });
  const handleClearStartDate = () => onAutoSave({ startDate: null });
  const handleClearDueDate = () => onAutoSave({ dueDate: null });

  const handleStatusChange = (v: string) => onAutoSave({ status: v });
  const handlePriorityChange = (v: string) => onAutoSave({ priority: v });
  const handleTypeChange = (v: string) => onAutoSave({ type: v });
  const handleSprintChange = (v: string) =>
    onAutoSave({ sprintId: v === "none" ? undefined : parseInt(v) });
  const handleEpicChange = (v: string) =>
    onAutoSave({ epicId: v === "none" ? null : parseInt(v) });
  const handleModuleChange = (v: string) =>
    onAutoSave({ moduleId: v === "none" ? null : parseInt(v) });

  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
    onAutoSave({ points: val });
  };

  const timeSpent = ticket.timeSpent ? parseFloat(ticket.timeSpent) : 0;
  const originalEstimate = ticket.originalEstimate
    ? parseFloat(ticket.originalEstimate)
    : 0;
  const timeProgress =
    originalEstimate > 0
      ? Math.min((timeSpent / originalEstimate) * 100, 100)
      : 0;

  const currentAssigneeIds = ticket.assignees
    ? ticket.assignees.map((a) => a.userId)
    : ticket.assignee
      ? [ticket.assignee.id]
      : [];

  const handleRemoveAssignee = (personId: string) => {
    const newIds = currentAssigneeIds.filter((id) => id !== personId);
    onAutoSave({ assigneeId: newIds[0] || "", assigneeIds: newIds });
  };

  const handleAddAssignee = (v: string) => {
    if (!v || v === "unassigned") return;
    if (currentAssigneeIds.includes(v)) return;
    const newIds = [...currentAssigneeIds, v];
    onAutoSave({ assigneeId: newIds[0] || "", assigneeIds: newIds });
  };

  const displayedAssignees: DisplayedAssignee[] =
    ticket.assignees && ticket.assignees.length > 0
      ? ticket.assignees
          .filter((a) => !!a.user)
          .map((a) => ({
            id: a.userId,
            firstName: a.user!.firstName,
            lastName: a.user!.lastName,
            image: a.user!.image,
          }))
      : ticket.assignee
        ? [ticket.assignee]
        : [];

  return (
    <div className="px-4 py-3 space-y-1 bg-muted/10">

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Status
          </span>
          <Select
            value={ticket.status || "TODO"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses?.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name.replace(/_/g, " ")}
                </SelectItem>
              )) || (
                <>
                  <SelectItem value="TODO">
                    <span className="flex items-center gap-1.5">
                      <Circle className="h-3 w-3" /> To Do
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-3 w-3 text-blue-500" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_REVIEW">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-purple-500" /> In Review
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> Done
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Priority
          </span>
          <Select
            value={ticket.priority || "MEDIUM"}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Type
          </span>
          <Select
            value={ticket.type || "TASK"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="STORY">Story</SelectItem>
              <SelectItem value="EPIC">Epic</SelectItem>
              <SelectItem value="SUBTASK">Subtask</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Points
          </span>
          <Input
            type="number"
            min={0}
            value={ticket.points ?? ""}
            onChange={handlePointsChange}
            className="h-8 text-xs bg-background w-full"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Target className="h-3 w-3 inline mr-0.5" />
            Sprint
          </span>
          <Select
            value={ticket.sprintId?.toString() || "none"}
            onValueChange={handleSprintChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {sprints?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                  {s.status === "ACTIVE" ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Zap className="h-3 w-3 inline mr-0.5" />
            Epic
          </span>
          <Select
            value={ticket.epicId?.toString() || "none"}
            onValueChange={handleEpicChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {selectableEpics.map((epic) => (
                <SelectItem key={epic.id} value={epic.id.toString()}>
                  {epic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Boxes className="h-3 w-3 inline mr-0.5" />
            Module
          </span>
          <Select
            value={ticket.moduleId?.toString() || "none"}
            onValueChange={handleModuleChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(modules ?? []).map((mod) => (
                <SelectItem key={mod.id} value={mod.id.toString()}>
                  {mod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Calendar className="h-3 w-3 inline mr-0.5" />
            Start date
          </span>
          <div className="flex items-center gap-1">
            <DatePicker
              value={ticket.startDate ?? undefined}
              onChange={handleStartDateChange}
              placeholder="Set start"
              toDate={ticket.dueDate ? new Date(ticket.dueDate) : undefined}
              className="h-8 text-xs"
            />
            {ticket.startDate && (
              <button
                type="button"
                onClick={handleClearStartDate}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Clear start date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Calendar className="h-3 w-3 inline mr-0.5" />
            Due date
          </span>
          <div className="flex items-center gap-1">
            <DatePicker
              value={ticket.dueDate ?? undefined}
              onChange={handleDueDateChange}
              placeholder="Set due"
              fromDate={ticket.startDate ? new Date(ticket.startDate) : undefined}
              className="h-8 text-xs"
            />
            {ticket.dueDate && (
              <button
                type="button"
                onClick={handleClearDueDate}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Clear due date"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
          Assignees
        </span>
        {displayedAssignees.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {displayedAssignees.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-1 bg-muted rounded-full pl-0.5 pr-1.5 py-0.5"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resolveImageUrl(person.image)} />
                  <AvatarFallback className="text-[7px]">
                    {person.firstName?.[0]}
                    {person.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px]">
                  {person.firstName}
                </span>
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                  onClick={() => handleRemoveAssignee(person.id)}
                  aria-label={`Remove ${person.firstName}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </div>
            ))}
          </div>
        )}
        <Select value="" onValueChange={handleAddAssignee}>
          <SelectTrigger className="h-8 text-xs bg-background w-full">
            <SelectValue placeholder="+ Add assignee" />
          </SelectTrigger>
          <SelectContent>
            {members
              ?.filter((m) => !currentAssigneeIds.includes(m.id))
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-[8px]">
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{member.firstName} {member.lastName}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-1">
        <LabelPicker
          ticketId={ticketId}
          projectId={projectId}
          currentLabels={
            (ticket.labels || []).filter((l) => !!l.label) as Array<{
              label: { id: number; name: string; color: string | null };
            }>
          }
        />
      </div>

      {(timeSpent > 0 || originalEstimate > 0) && (
        <div className="pt-1">
          <PropertyRow label="Time">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span>{timeSpent}h logged</span>
              {originalEstimate > 0 && (
                <span className="text-muted-foreground">/ {originalEstimate}h est</span>
              )}
            </div>
            {originalEstimate > 0 && <Progress value={timeProgress} className="h-1 mt-1" />}
          </PropertyRow>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "—"}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : "—"}
        </div>
      </div>

      {ticket.reporter && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
            <User className="h-3 w-3 inline mr-0.5" />Reporter
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-5 w-5">
              <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
              <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                {ticket.reporter.firstName?.[0]}{ticket.reporter.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">
              {ticket.reporter.firstName} {ticket.reporter.lastName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
