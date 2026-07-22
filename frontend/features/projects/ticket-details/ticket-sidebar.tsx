"use client";

import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Calendar } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import { format } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { useEpics, useModules, useCycles } from "@/hooks/api/projects";
import { LabelPicker } from "../tickets/label-picker";
import { RecurrencePicker } from "../tickets/recurrence-picker";
import { useSetRecurrence, type RecurrenceRule } from "@/hooks/api/projects/recurring";
import { SidebarSelectFields } from "./sidebar-select-fields";
import { SidebarAssigneeSection, type DisplayedAssignee } from "./sidebar-assignee-section";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TruncatedText } from "@/components/ui/truncated-text";

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
    cycleId?: number | null;
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
        name?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        image?: string | null;
      } | null;
    }>;
    assignee?: {
      id: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
    reporter?: {
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      image?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    isRecurring?: boolean | null;
    recurrenceRule?: RecurrenceRule | null;
  };
  ticketId: number;
  projectId?: number;
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
      <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketSidebar({
  ticket,
  ticketId,
  projectId,
  sprints,
  statuses,
  onAutoSave,
}: TicketSidebarProps) {
  const { data: epics } = useEpics(projectId ?? 0);
  const { data: modules } = useModules(projectId ?? 0);
  const { data: cycles } = useCycles(projectId ?? 0);
  const setRecurrence = useSetRecurrence(projectId ?? 0, ticketId);
  const selectableEpics = (epics ?? []).filter((e) => e.id !== ticket.id);

  const handleStartDateChange = (value: string) => onAutoSave({ startDate: value || null });
  const handleDueDateChange = (value: string) => onAutoSave({ dueDate: value || null });
  const handleClearStartDate = () => onAutoSave({ startDate: null });
  const handleClearDueDate = () => onAutoSave({ dueDate: null });
  const handleRecurrenceChange = (rule: RecurrenceRule | null) => setRecurrence.mutate(rule);

  const handleStatusChange = (v: string) => onAutoSave({ status: v });
  const handlePriorityChange = (v: string) => onAutoSave({ priority: v });
  const handleTypeChange = (v: string) => onAutoSave({ type: v });
  const handleSprintChange = (v: string) =>
    onAutoSave({ sprintId: v === "none" ? undefined : parseInt(v) });
  const handleEpicChange = (v: string) =>
    onAutoSave({ epicId: v === "none" ? null : parseInt(v) });
  const handleModuleChange = (v: string) =>
    onAutoSave({ moduleId: v === "none" ? null : parseInt(v) });
  const handleCycleChange = (v: string) =>
    onAutoSave({ cycleId: v === "none" ? null : parseInt(v) });
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
    onAutoSave({ points: val });
  };

  const timeSpent = ticket.timeSpent ? parseFloat(ticket.timeSpent) : 0;
  const originalEstimate = ticket.originalEstimate ? parseFloat(ticket.originalEstimate) : 0;
  const timeProgress =
    originalEstimate > 0 ? Math.min((timeSpent / originalEstimate) * 100, 100) : 0;

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
            name: a.user?.name,
            firstName: a.user?.firstName,
            lastName: a.user?.lastName,
            email: a.user?.email,
            image: a.user?.image,
          }))
      : ticket.assignee
        ? [ticket.assignee]
        : [];

  return (
    <div className="@container space-y-3 bg-muted/10 px-4 py-3">
      <SidebarSelectFields
        ticket={ticket}
        statuses={statuses}
        sprints={sprints}
        epics={selectableEpics}
        modules={modules ?? []}
        cycles={cycles ?? []}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onTypeChange={handleTypeChange}
        onPointsChange={handlePointsChange}
        onSprintChange={handleSprintChange}
        onEpicChange={handleEpicChange}
        onModuleChange={handleModuleChange}
        onCycleChange={handleCycleChange}
      />

      <div className="grid grid-cols-1 gap-3 @[18rem]:grid-cols-2 md:grid-cols-2">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Calendar className="mr-0.5 inline h-3 w-3" />
            Start date
          </span>
          <div className="flex min-w-0 items-center gap-1">
            <DatePicker
              value={ticket.startDate ?? undefined}
              onChange={handleStartDateChange}
              placeholder="Set start"
              toDate={ticket.dueDate ? new Date(ticket.dueDate) : undefined}
              className="min-h-10 min-w-0 flex-1 touch-manipulation text-xs @[18rem]:min-h-9 md:min-h-9"
            />
            {ticket.startDate && (
              <AnimatedIconButton
                type="button"
                variant="ghost"
                size="icon"
                icon={XIcon}
                iconSize={14}
                onClick={handleClearStartDate}
                className="h-10 w-10 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive @[18rem]:h-8 @[18rem]:w-8 md:h-8 md:w-8"
                aria-label="Clear start date"
              />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Calendar className="mr-0.5 inline h-3 w-3" />
            Due date
          </span>
          <div className="flex min-w-0 items-center gap-1">
            <DatePicker
              value={ticket.dueDate ?? undefined}
              onChange={handleDueDateChange}
              placeholder="Set due"
              fromDate={ticket.startDate ? new Date(ticket.startDate) : undefined}
              className="min-h-10 min-w-0 flex-1 touch-manipulation text-xs @[18rem]:min-h-9 md:min-h-9"
            />
            {ticket.dueDate && (
              <AnimatedIconButton
                type="button"
                variant="ghost"
                size="icon"
                icon={XIcon}
                iconSize={14}
                onClick={handleClearDueDate}
                className="h-10 w-10 shrink-0 touch-manipulation text-muted-foreground hover:text-destructive @[18rem]:h-8 @[18rem]:w-8 md:h-8 md:w-8"
                aria-label="Clear due date"
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <RecurrencePicker
          value={ticket.recurrenceRule ?? null}
          onChange={handleRecurrenceChange}
        />
      </div>

      <SidebarAssigneeSection
        projectId={projectId ?? 0}
        displayedAssignees={displayedAssignees}
        onAddAssignee={handleAddAssignee}
        onRemoveAssignee={handleRemoveAssignee}
      />

      <div>
        <LabelPicker
          ticketId={ticketId}
          projectId={projectId}
          currentLabels={(ticket.labels ?? []).filter(
            (l): l is { label: { id: number; name: string; color: string | null } } => l.label != null,
          )}
        />
      </div>

      {(timeSpent > 0 || originalEstimate > 0) && (
        <div>
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

      <div className="grid grid-cols-1 gap-2 @[18rem]:grid-cols-2 @[18rem]:gap-3 md:grid-cols-2 md:gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>Created {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>Updated {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : "—"}</span>
        </div>
      </div>

      {ticket.reporter && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
            <User className="h-3 w-3 inline mr-0.5" />
            Reporter
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={resolveImageUrl(ticket.reporter.image)} />
              <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                {getUserInitials(ticket.reporter)}
              </AvatarFallback>
            </Avatar>
            <TruncatedText text={getUserDisplayName(ticket.reporter)} className="min-w-0 flex-1 text-xs" />
          </div>
        </div>
      )}
    </div>
  );
}
