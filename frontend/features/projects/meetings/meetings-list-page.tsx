"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronDown, FileText, Zap, CalendarClock, Clock, Users, ClipboardList, Layers,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  useMeetings,
  useCreateMeeting,
  useProjectMembers,
  useSprints,
  useProjectBoardTickets,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_TOOLBAR,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";

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
  const hostLabel = host ? getUserDisplayName(host) : null;
  const scheduledDate = meeting.scheduledAt ? new Date(meeting.scheduledAt) : null;

  return (
    <div
      className={cn(
        PM_PANEL,
        "mb-0 flex flex-wrap items-center gap-3 border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm",
      )}
    >
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
        <span className="shrink-0 text-xs font-normal text-muted-foreground">Next meeting</span>
        <Link
          href={`/projects/${projectId}/meetings/${meeting.id}`}
          className={cn(TEXT_ONE_LINE, "max-w-[min(100%,20rem)] font-semibold text-foreground hover:underline")}
          title={meeting.title}
        >
          {meeting.title}
        </Link>
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {scheduledDate ? (
          <span className="tabular-nums">
            {scheduledDate.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
        {meeting.durationMinutes != null ? (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meeting.durationMinutes}m
          </span>
        ) : null}
        {hostLabel ? (
          <span className="flex max-w-[8rem] items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            <span className={TEXT_ONE_LINE}>{hostLabel}</span>
          </span>
        ) : null}
        {(meeting.attendeeCount ?? 0) > 0 ? (
          <span>{meeting.attendeeCount} attendee{meeting.attendeeCount !== 1 ? "s" : ""}</span>
        ) : null}
        <MeetingTypeBadge type={meeting.type} />
      </div>
    </div>
  );
}

function NewMeetingButton({
  onBlank,
  onTemplate,
}: {
  onBlank: () => void;
  onTemplate: (tpl: MeetingTemplate) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 text-xs" {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          New Meeting
          <ChevronDown className="ml-0.5 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onBlank}>
          <Zap className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          Blank meeting
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {TEMPLATES.map((tpl) => (
          <DropdownMenuItem key={tpl.label} onClick={() => onTemplate(tpl)}>
            <FileText className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            {tpl.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  const { data: boardTickets } = useProjectBoardTickets(projectId);
  const tickets = boardTickets ?? [];

  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === "ACTIVE") ?? null,
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

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const memberOptions = useMemo(
    () =>
      projectMembers.map((m) => ({
        value: m.id,
        label: getUserDisplayName(m),
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
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href={`/projects/${projectId}/meetings/${row.id}`}
              className={cn(TEXT_ONE_LINE, "block max-w-[min(100%,24rem)] font-medium text-foreground hover:text-primary")}
              title={row.title}
            >
              {row.title}
            </Link>
            {row.sprintId != null && sprintMap.has(row.sprintId) ? (
              <span className={cn(TEXT_ONE_LINE, "flex max-w-[14rem] items-center gap-1 text-[11px] text-muted-foreground")}>
                <Layers className="h-3 w-3 shrink-0" />
                {sprintMap.get(row.sprintId)?.name}
              </span>
            ) : null}
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
              <span className="tabular-nums text-sm text-foreground">
                {new Date(row.scheduledAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            {row.durationMinutes != null ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                {row.durationMinutes}m
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "host",
        header: "Host",
        className: "w-32",
        cell: (row) => {
          const host = row.createdBy ? memberMap.get(row.createdBy) : undefined;
          if (!host) return <span className="text-sm text-muted-foreground">—</span>;
          const label = getUserDisplayName(host);
          return (
            <span className={cn(TEXT_ONE_LINE, "block max-w-[120px] text-sm text-foreground")} title={host.email}>
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
          <span className="flex items-center gap-1 tabular-nums text-sm text-muted-foreground">
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
          <div className="flex items-center gap-1.5 tabular-nums text-sm text-muted-foreground">
            {(row.actionItemCount ?? 0) > 0 ? (
              <>
                <ClipboardList className="h-3 w-3 shrink-0" />
                {row.actionItemCount}
                {(row.unresolvedActionItemCount ?? 0) > 0 ? (
                  <Badge variant="outline" className="ml-0.5 px-1 py-0 text-[10px] text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30">
                    {row.unresolvedActionItemCount} open
                  </Badge>
                ) : null}
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
            <FileText className="h-3.5 w-3.5 text-primary" aria-label="Has notes" />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [projectId, memberMap, sprintMap],
  );

  const filtersBar = (
    <div className={cn(PM_TOOLBAR, "w-full")}>
      <div className="flex flex-wrap items-center gap-2">
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
        {projectMembers.length > 0 ? (
          <Combobox
            options={memberOptions}
            value={hostId}
            onChange={setHostId}
            placeholder="Host…"
            searchPlaceholder="Search hosts…"
            emptyText="No members"
            className="h-8 w-32 text-xs"
          />
        ) : null}
        {projectMembers.length > 0 ? (
          <Combobox
            options={memberOptions}
            value={attendeeId}
            onChange={setAttendeeId}
            placeholder="Attendee…"
            searchPlaceholder="Search attendees…"
            emptyText="No members"
            className="h-8 w-32 text-xs"
          />
        ) : null}
        {isFiltered ? (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleClearFilters}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );

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
      className="min-h-[28vh]"
    />
  ) : (
    <EmptyState
      illustrationPreset="search"
      title="No meetings match your filters"
      description={search ? `No meetings found for "${search}".` : "Try adjusting your filters."}
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className="min-h-[28vh]"
    />
  );

  return (
    <PageWrapper
      title="Meetings"
      eyebrow="Project"
      subtitle="Schedule meetings, standups, and retros for your project"
      filters={filtersBar}
      actions={
        canManage ? (
          <NewMeetingButton onBlank={handleOpenSheet} onTemplate={handleOpenTemplate} />
        ) : undefined
      }
    >
      <PmPageShell>
        {nextMeeting ? (
          <PmSection index={0}>
            <NextMeetingStrip
              meeting={nextMeeting}
              projectId={projectId}
              members={projectMembers}
            />
          </PmSection>
        ) : null}

        <PmSection index={nextMeeting ? 1 : 0} className="flex min-h-0 flex-1 flex-col">
          {isError ? (
            <PmPanel className="flex flex-1 items-center justify-center p-6">
              <ErrorState className="flex-1" onRetry={handleRetry} />
            </PmPanel>
          ) : (
            <PmPanel className="min-h-0 flex-1">
              <DataTable
                className="min-h-0 flex-1"
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
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

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
