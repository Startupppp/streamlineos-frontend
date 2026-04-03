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
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { LabelPicker } from "../label-picker";
import type { ProjectMember } from "./types";

interface TicketSidebarProps {
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    sprintId?: number | null;
    epicId?: number | null;
    timeSpent?: string | null;
    originalEstimate?: string | null;
    link?: string | null;
    labels?: Array<{ label?: { id: number; name: string; color: string | null } | null }>;
    assignees?: Array<{ userId: string; user?: { firstName?: string | null; lastName?: string | null; image?: string | null } | null }>;
    assignee?: { id: string; firstName?: string | null; lastName?: string | null; image?: string | null } | null;
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
  members: ProjectMember[];
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
}

export function TicketSidebar({
  ticket,
  ticketId,
  members,
  sprints,
  statuses,
  onAutoSave,
}: TicketSidebarProps) {
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

  const displayedAssignees =
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
    <div className="p-4 sm:p-6 bg-muted/20 space-y-4">
      {/* Status */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
          Status
        </label>
        <Select
          value={ticket.status || "TODO"}
          onValueChange={(value) => onAutoSave({ status: value })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses?.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            )) || (
              <>
                <SelectItem value="TODO">
                  <span className="flex items-center gap-2">
                    <Circle className="h-3 w-3" /> To Do
                  </span>
                </SelectItem>
                <SelectItem value="IN_PROGRESS">
                  <span className="flex items-center gap-2">
                    <Timer className="h-3 w-3 text-blue-500" /> In Progress
                  </span>
                </SelectItem>
                <SelectItem value="IN_REVIEW">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-purple-500" /> In
                    Review
                  </span>
                </SelectItem>
                <SelectItem value="DONE">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" /> Done
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
          Priority
        </label>
        <Select
          value={ticket.priority || "MEDIUM"}
          onValueChange={(value) => onAutoSave({ priority: value })}
        >
          <SelectTrigger className="bg-background">
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

      {/* Type */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
          Type
        </label>
        <Select
          value={ticket.type || "TASK"}
          onValueChange={(value) => onAutoSave({ type: value })}
        >
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK">Task</SelectItem>
            <SelectItem value="BUG">Bug</SelectItem>
            <SelectItem value="STORY">Story</SelectItem>
            <SelectItem value="EPIC">Epic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignees */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
          Assignees
        </label>
        {/* Current assignees as chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {displayedAssignees.map(
            (person: {
              id: string;
              firstName?: string | null;
              lastName?: string | null;
              image?: string | null;
            }) => (
              <div
                key={person.id}
                className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={resolveImageUrl(person.image)} />
                  <AvatarFallback className="text-[8px]">
                    {person.firstName?.[0]}
                    {person.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">
                  {person.firstName} {person.lastName}
                </span>
                <button
                  className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => {
                    const newIds = currentAssigneeIds.filter(
                      (id) => id !== person.id
                    );
                    onAutoSave({
                      assigneeId: newIds[0] || "",
                      assigneeIds: newIds,
                    });
                  }}
                  aria-label={`Remove ${person.firstName}`}
                >
                  <span className="text-xs font-bold">&times;</span>
                </button>
              </div>
            )
          )}
        </div>
        {/* Add assignee dropdown */}
        <Select
          value=""
          onValueChange={(value) => {
            if (!value || value === "unassigned") return;
            if (currentAssigneeIds.includes(value)) return;
            const newIds = [...currentAssigneeIds, value];
            onAutoSave({
              assigneeId: newIds[0] || "",
              assigneeIds: newIds,
            });
          }}
        >
          <SelectTrigger className="bg-background h-8 text-xs">
            <SelectValue placeholder="+ Add assignee" />
          </SelectTrigger>
          <SelectContent>
            {members
              ?.filter((m) => !currentAssigneeIds.includes(m.id))
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-[9px]">
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sprint */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
          <Target className="h-3 w-3" /> Sprint
        </label>
        <Select
          value={ticket.sprintId?.toString() || "none"}
          onValueChange={(value) =>
            onAutoSave({
              sprintId: value === "none" ? undefined : parseInt(value),
            })
          }
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="No sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sprint</SelectItem>
            {sprints?.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id.toString()}>
                {sprint.name}{" "}
                {sprint.status === "ACTIVE" ? "(Active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Epic */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Epic
        </label>
        <Select
          value={ticket.epicId?.toString() || "none"}
          onValueChange={(value) =>
            onAutoSave({
              epicId: value === "none" ? undefined : parseInt(value),
            })
          }
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="No epic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No epic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Story Points */}
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1.5">
          Story Points
        </label>
        <Input
          type="number"
          min={0}
          value={ticket.points ?? ""}
          onChange={(e) => {
            const val =
              e.target.value === "" ? undefined : parseInt(e.target.value);
            onAutoSave({ points: val });
          }}
          className="bg-background h-9"
          placeholder="0"
        />
      </div>

      {/* Time Tracking */}
      {(timeSpent > 0 || originalEstimate > 0) && (
        <div className="rounded-lg border bg-background p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5" />
            Time Tracking
          </div>
          <div className="flex justify-between text-xs">
            <span>{timeSpent}h logged</span>
            {originalEstimate > 0 && (
              <span>{originalEstimate}h estimated</span>
            )}
          </div>
          {originalEstimate > 0 && (
            <Progress value={timeProgress} className="h-1.5" />
          )}
        </div>
      )}

      {/* Labels */}
      <LabelPicker
        ticketId={ticketId}
        currentLabels={
          (ticket.labels || []).filter((l) => !!l.label) as Array<{
            label: { id: number; name: string; color: string | null };
          }>
        }
      />

      {/* Link */}
      {ticket.link && (
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
            <LinkIcon className="h-3.5 w-3.5" />
            Attached Link
          </div>
          <a
            href={
              ticket.link.startsWith("http")
                ? ticket.link
                : `https://${ticket.link}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1.5 break-all font-medium transition-colors"
          >
            <span className="truncate">{ticket.link}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
      )}

      {/* Created By */}
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          <User className="h-3.5 w-3.5" />
          Created By
        </div>
        {ticket.reporter ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {ticket.reporter.firstName?.[0]}
                {ticket.reporter.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {ticket.reporter.firstName} {ticket.reporter.lastName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {ticket.reporter.email}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unknown</span>
        )}
      </div>

      {/* Timestamps */}
      <div className="rounded-lg border bg-background p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Created</span>
          <span className="ml-auto font-medium text-foreground">
            {ticket.createdAt
              ? format(new Date(ticket.createdAt), "MMM d, yyyy")
              : "-"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated</span>
          <span className="ml-auto font-medium text-foreground">
            {ticket.updatedAt
              ? format(new Date(ticket.updatedAt), "MMM d, yyyy")
              : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
