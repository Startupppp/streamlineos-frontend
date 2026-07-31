"use client";

import { useEpics, useModules, useCycles } from "@/hooks/api/build";
import { LabelPicker } from "../tickets/label-picker";
import { RecurrencePicker } from "../tickets/recurrence-picker";
import {
  useSetRecurrence,
  type RecurrenceRule,
} from "@/hooks/api/build/recurring";
import { SidebarSelectFields } from "./sidebar-select-fields";
import {
  SidebarAssigneeSection,
  type DisplayedAssignee,
} from "./sidebar-assignee-section";
import { TicketParentControl } from "./ticket-parent-control";
import { TicketCustomerPicker } from "./ticket-customer-picker";
import { TicketDateFields } from "./ticket-date-fields";
import { TicketSidebarMetadata } from "./ticket-sidebar-metadata";

interface TicketSidebarProps {
  ticket: {
    id: number;
    parentTicketId?: number | null;
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
    customerId?: number | null;
    customer?: { id: number; name: string } | null;
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
  projectKey?: string | null;
  sprints: Array<{ id: number; name: string; status?: string | null }>;
  statuses?: Array<{ name: string; id: number }>;
  onAutoSave: (field: Record<string, unknown>) => void;
}

export function TicketSidebar({
  ticket,
  ticketId,
  projectId,
  projectKey,
  sprints,
  statuses,
  onAutoSave,
}: TicketSidebarProps) {
  const { data: epics } = useEpics(projectId ?? 0);
  const { data: modules } = useModules(projectId ?? 0);
  const { data: cycles } = useCycles(projectId ?? 0);
  const setRecurrence = useSetRecurrence(projectId ?? 0, ticketId);
  const selectableEpics = (epics ?? []).filter((e) => e.id !== ticket.id);

  const handleCustomerChange = (id: number | null) =>
    onAutoSave({ customerId: id });
  const handleStartDateChange = (value: string) =>
    onAutoSave({ startDate: value || null });
  const handleDueDateChange = (value: string) =>
    onAutoSave({ dueDate: value || null });
  const handleClearStartDate = () => onAutoSave({ startDate: null });
  const handleClearDueDate = () => onAutoSave({ dueDate: null });
  const handleRecurrenceChange = (rule: RecurrenceRule | null) =>
    setRecurrence.mutate(rule);

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
    <div className="@container space-y-3 border-b border-r border-border bg-muted/10 px-4 py-3">
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

      {projectId != null ? (
        <TicketParentControl
          ticket={{
            id: ticket.id,
            parentTicketId: ticket.parentTicketId ?? null,
          }}
          projectId={projectId}
          projectKey={projectKey}
          variant="field"
        />
      ) : null}

      <TicketCustomerPicker
        customerId={ticket.customerId}
        customerName={ticket.customer?.name}
        onChange={handleCustomerChange}
      />

      <TicketDateFields
        startDate={ticket.startDate}
        dueDate={ticket.dueDate}
        onStartDateChange={handleStartDateChange}
        onDueDateChange={handleDueDateChange}
        onClearStartDate={handleClearStartDate}
        onClearDueDate={handleClearDueDate}
      />

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
            (
              l,
            ): l is {
              label: { id: number; name: string; color: string | null };
            } => l.label != null,
          )}
        />
      </div>

      <TicketSidebarMetadata
        timeSpent={ticket.timeSpent}
        originalEstimate={ticket.originalEstimate}
        createdAt={ticket.createdAt}
        updatedAt={ticket.updatedAt}
        reporter={ticket.reporter}
      />
    </div>
  );
}
