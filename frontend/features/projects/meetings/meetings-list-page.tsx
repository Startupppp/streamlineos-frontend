"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, ChevronDown, FileText, Zap, CalendarClock, Clock, Users, ClipboardList, Layers } from "lucide-react";
import { useMeetings, useCreateMeeting, useProjectMembers, useSprints, useTickets } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MeetingTypeBadge, MeetingStatusBadge } from "./meeting-badges";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { generateAgenda, type AgendaSource } from "./generate-agenda";
import type { Meeting, CreateMeetingInput, MeetingType } from "@/types/projects";
import type { ProjectMemberRecord } from "@/types/projects";

const TYPE_OPTS = [
  { value: "all", label: "All types" },
  { value: "meeting", label: "Meeting" },
  { value: "standup", label: "Standup" },
  { value: "retro", label: "Retro" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
];

const STATUS_OPTS = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_OPTS = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const ACTION_ITEM_OPTS = [
  { value: "all", label: "Any" },
  { value: "has", label: "Has action items" },
  { value: "unresolved", label: "Has unresolved items" },
];

interface MeetingTemplate {
  type: MeetingType;
  label: string;
  duration: number;
  agenda: string;
}

const TEMPLATES: MeetingTemplate[] = [
  {
    type: "standup",
    label: "Daily Standup",
    duration: 15,
    agenda: "1. What did you do yesterday?\n2. What will you do today?\n3. Any blockers?",
  },
  {
    type: "planning",
    label: "Sprint Planning",
    duration: 60,
    agenda: "1. Review sprint goal\n2. Review backlog items\n3. Estimate and commit to tickets\n4. Clarify acceptance criteria",
  },
  {
    type: "review",
    label: "Sprint Review",
    duration: 60,
    agenda: "1. Demo completed work\n2. Gather stakeholder feedback\n3. Review sprint metrics\n4. Update product backlog",
  },
  {
    type: "retro",
    label: "Retrospective",
    duration: 60,
    agenda: "1. What went well?\n2. What could be improved?\n3. Action items for next sprint",
  },
  {
    type: "meeting",
    label: "1:1",
    duration: 30,
    agenda: "1. Updates and progress\n2. Blockers and support needed\n3. Goals for next period",
  },
  {
    type: "meeting",
    label: "Ad-hoc Meeting",
    duration: 30,
    agenda: "",
  },
];

interface MeetingsListPageProps {
  projectId: number;
}

interface NextMeetingStripProps {
  meeting: Meeting;
  projectId: number;
  members: ProjectMemberRecord[];
}

function NextMeetingStrip({ meeting, projectId, members }: NextMeetingStripProps) {
  const host = members.find((m) => m.id === meeting.createdBy);
  const hostLabel = host ? (host.name ?? host.firstName ?? host.email) : null;
  const scheduledDate = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;

  return (
    <div className="flex items-center gap-4 px-4 py-3 mb-3 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10 text-sm">
      <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
      <div className="flex items-center gap-1.5 font-medium text-blue-900 dark:text-blue-200 truncate">
        <span className="text-xs text-blue-500 dark:text-blue-400 font-normal shrink-0">Next meeting</span>
        <Link
          href={`/projects/${projectId}/meetings/${meeting.id}`}
          className="truncate hover:underline font-semibold text-blue-800 dark:text-blue-300"
        >
          {meeting.title}
        </Link>
      </div>
      <div className="flex items-center gap-3 ml-auto shrink-0 text-blue-700/80 dark:text-blue-400 text-xs">
        {scheduledDate && (
          <span className="tabular-nums">
            {scheduledDate.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {meeting.durationMinutes != null && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meeting.durationMinutes}m
          </span>
        )}
        {hostLabel && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {hostLabel}
          </span>
        )}
        {(meeting.attendeeCount ?? 0) > 0 && (
          <span>{meeting.attendeeCount} attendee{meeting.attendeeCount !== 1 ? "s" : ""}</span>
        )}
        <MeetingTypeBadge type={meeting.type} />
      </div>
    </div>
  );
}

export function MeetingsListPage({ projectId }: MeetingsListPageProps) {
  const canManage = useCan("projects:meetings:manage");

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [hostId, setHostId] = useState("");
  const [attendeeId, setAttendeeId] = useState("");
  const [actionItemFilter, setActionItemFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);

  const { data: projectMembers = [] } = useProjectMembers(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const { data: ticketsPage } = useTickets(projectId, { limit: 100 });
  const tickets = ticketsPage?.data ?? [];

  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === "active") ?? null,
    [sprints],
  );

  const { data, isLoading, isError, refetch } = useMeetings(projectId, {
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    dateFilter: dateFilter !== "all" ? (dateFilter as "today" | "this_week" | "upcoming" | "past") : undefined,
    hostId: hostId || undefined,
    attendeeId: attendeeId || undefined,
    hasActionItems: actionItemFilter === "has" ? true : undefined,
    hasUnresolvedActionItems: actionItemFilter === "unresolved" ? true : undefined,
  });

  const { data: upcomingMeetings } = useMeetings(projectId, { dateFilter: "upcoming", status: "scheduled" });

  const nextMeeting = useMemo(() => {
    const list = upcomingMeetings ?? [];
    if (list.length === 0) return null;
    return list.reduce<Meeting | null>((nearest, m) => {
      if (!m.scheduledAt) return nearest;
      if (!nearest || !nearest.scheduledAt) return m;
      return new Date(m.scheduledAt) < new Date(nearest.scheduledAt) ? m : nearest;
    }, null);
  }, [upcomingMeetings]);

  const createMeeting = useCreateMeeting(projectId);

  const displayed = useMemo(() => {
    const meetings = data ?? [];
    if (!search.trim()) return meetings;
    const q = search.toLowerCase();
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        `mtg-${m.meetingNumber}`.includes(q),
    );
  }, [data, search]);

  const isFiltered =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    !!hostId ||
    !!attendeeId ||
    actionItemFilter !== "all" ||
    !!search.trim();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setHostId("");
    setAttendeeId("");
    setActionItemFilter("all");
    setSearch("");
  }, []);

  function handleOpenSheet() {
    setSelectedTemplate(null);
    setSheetOpen(true);
  }

  function handleOpenTemplate(tpl: MeetingTemplate) {
    setSelectedTemplate(tpl);
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setSelectedTemplate(null);
  }

  function handleCreate(input: CreateMeetingInput) {
    createMeeting.mutate(input, {
      onSuccess: () => {
        toast.success("Meeting created");
        setSheetOpen(false);
        setSelectedTemplate(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleScheduleStandup() {
    handleOpenTemplate(TEMPLATES[0]!);
  }

  function handleSchedulePlanning() {
    handleOpenTemplate(TEMPLATES[1]!);
  }

  const handleGenerateAgenda = useCallback(
    (sources: AgendaSource[]): string =>
      generateAgenda({ sprint: activeSprint, tickets, sources }),
    [activeSprint, tickets],
  );

  const memberOptions = useMemo(
    () =>
      projectMembers.map((m) => ({
        value: m.id,
        label: m.name ?? m.email,
        sublabel: m.email,
      })),
    [projectMembers],
  );

  const memberMap = useMemo(
    () => new Map(projectMembers.map((m) => [m.id, m])),
    [projectMembers],
  );

  const sprintMap = useMemo(
    () => new Map(sprints.map((s) => [s.id, s])),
    [sprints],
  );

  const columns: DataTableColumn<Meeting>[] = useMemo(
    () => [
      {
        key: "meetingNumber",
        header: "ID",
        className: "w-20",
        cell: (row) => (
          <Link
            href={`/projects/${projectId}/meetings/${row.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            MTG-{row.meetingNumber}
          </Link>
        ),
      },
      {
        key: "title",
        header: "Title",
        sortable: true,
        sortValue: (row) => row.title,
        cell: (row) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <Link
              href={`/projects/${projectId}/meetings/${row.id}`}
              className="font-medium text-foreground hover:text-primary truncate max-w-[240px] block"
            >
              {row.title}
            </Link>
            {row.sprintId != null && sprintMap.has(row.sprintId) && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <Layers className="h-3 w-3 shrink-0" />
                {sprintMap.get(row.sprintId)!.name}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        className: "w-24",
        cell: (row) => <MeetingTypeBadge type={row.type} />,
      },
      {
        key: "status",
        header: "Status",
        className: "w-28",
        cell: (row) => <MeetingStatusBadge status={row.status} />,
      },
      {
        key: "scheduledAt",
        header: "Date / Duration",
        sortable: true,
        sortValue: (row) => row.scheduledAt ?? "",
        cell: (row) => (
          <div className="flex flex-col gap-0.5">
            {row.scheduledAt ? (
              <span className="text-sm text-foreground tabular-nums">
                {new Date(row.scheduledAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">—</span>
            )}
            {row.durationMinutes != null && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                {row.durationMinutes}m
              </span>
            )}
          </div>
        ),
      },
      {
        key: "host",
        header: "Host",
        className: "w-32",
        cell: (row) => {
          const host = row.createdBy ? memberMap.get(row.createdBy) : undefined;
          if (!host) return <span className="text-muted-foreground text-sm">—</span>;
          const label = host.name ?? host.firstName ?? host.email;
          return (
            <span className="text-sm text-foreground truncate max-w-[120px] block" title={host.email}>
              {label}
            </span>
          );
        },
      },
      {
        key: "attendeeCount",
        header: "Attendees",
        className: "w-24",
        cell: (row) => (
          <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
            {(row.attendeeCount ?? 0) > 0 ? (
              <>
                <Users className="h-3 w-3 shrink-0" />
                {row.attendeeCount}
              </>
            ) : (
              "—"
            )}
          </span>
        ),
      },
      {
        key: "actionItemCount",
        header: "Actions",
        className: "w-28",
        cell: (row) => (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            {(row.actionItemCount ?? 0) > 0 ? (
              <>
                <ClipboardList className="h-3 w-3 shrink-0" />
                {row.actionItemCount}
                {(row.unresolvedActionItemCount ?? 0) > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30 ml-0.5">
                    {row.unresolvedActionItemCount} open
                  </Badge>
                )}
              </>
            ) : (
              "—"
            )}
          </div>
        ),
      },
      {
        key: "notes",
        header: "Notes",
        className: "w-16",
        cell: (row) =>
          row.notes ? (
            <FileText className="h-3.5 w-3.5 text-blue-500" aria-label="Has notes" />
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
    ],
    [projectId, memberMap, sprintMap],
  );

  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={actionItemFilter} onValueChange={setActionItemFilter}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_ITEM_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {projectMembers.length > 0 && (
        <Combobox
          options={memberOptions}
          value={hostId}
          onChange={setHostId}
          placeholder="Host…"
          searchPlaceholder="Search hosts…"
          emptyText="No members"
          className="h-8 w-32 text-xs"
        />
      )}
      {projectMembers.length > 0 && (
        <Combobox
          options={memberOptions}
          value={attendeeId}
          onChange={setAttendeeId}
          placeholder="Attendee…"
          searchPlaceholder="Search attendees…"
          emptyText="No members"
          className="h-8 w-32 text-xs"
        />
      )}
      {isFiltered && (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClearFilters}>
          Clear
        </Button>
      )}
    </div>
  );

  const newMeetingButton = canManage ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Meeting
          <ChevronDown className="h-3 w-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleOpenSheet}>
          <Zap className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          Blank meeting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {TEMPLATES.map((tpl) => (
          <DropdownMenuItem key={tpl.label} onClick={() => handleOpenTemplate(tpl)}>
            <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            {tpl.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  const trueEmpty = !isFiltered && (data ?? []).length === 0 && !isLoading;

  const emptyStateNode = trueEmpty ? (
    <EmptyState
      illustrationPreset="calendar"
      title="No meetings yet"
      description="Keep your team aligned with meetings, standups, and retros. Include agenda, notes, action items, and attendees."
      action={canManage ? { label: "Schedule Standup", onClick: handleScheduleStandup } : undefined}
      secondaryAction={
        canManage
          ? { label: "Sprint Planning", onClick: handleSchedulePlanning }
          : undefined
      }
    />
  ) : (
    <EmptyState
      illustrationPreset="search"
      title="No meetings match your filters"
      description={search ? `No meetings found for "${search}".` : "Try adjusting your filters."}
      action={{ label: "Clear filters", onClick: handleClearFilters }}
    />
  );

  return (
    <PageWrapper
      title="Meetings"
      eyebrow="Project"
      subtitle="Schedule meetings, standups, and retros for your project"
      filters={filtersBar}
      actions={newMeetingButton}
    >
      {nextMeeting && (
        <NextMeetingStrip
          meeting={nextMeeting}
          projectId={projectId}
          members={projectMembers}
        />
      )}
      {isError ? (
        <ErrorState className="flex-1" onRetry={() => void refetch()} />
      ) : (
        <DataTable
          data={displayed}
          columns={columns}
          getRowKey={(row) => row.id}
          minWidth="1020px"
          isLoading={isLoading}
          search={{
            value: search,
            onChange: handleSearchChange,
            placeholder: "Search meetings…",
          }}
          emptyState={emptyStateNode}
        />
      )}

      <MeetingFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        mode="create"
        onSubmitCreate={handleCreate}
        onSubmitEdit={() => undefined}
        isPending={createMeeting.isPending}
        projectMembers={projectMembers}
        selectedTemplate={selectedTemplate}
        onGenerateAgenda={handleGenerateAgenda}
        hasActiveSprint={!!activeSprint}
      />
    </PageWrapper>
  );
}
