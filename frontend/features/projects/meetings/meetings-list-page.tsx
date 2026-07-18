"use client";

import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useMeetings,
  useCreateMeeting,
  useProjectMembers,
  useSprints,
  useProjectBoardTickets,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { NewMeetingButton, MEETING_TEMPLATES, type MeetingTemplate } from "./new-meeting-button";
import { NextMeetingStrip } from "./next-meeting-strip";
import { buildMeetingsColumns } from "./meetings-columns";
import { getErrorMessage } from "@/lib/get-error-message";
import { generateAgenda, type AgendaSource } from "./generate-agenda";
import type { Meeting, CreateMeetingInput } from "@/types/projects";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
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

interface MeetingsListPageProps {
  projectId: number;
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
    handleOpenTemplate(MEETING_TEMPLATES[0]!);
  }

  function handleSchedulePlanning() {
    handleOpenTemplate(MEETING_TEMPLATES[1]!);
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

  const columns = useMemo(
    () => buildMeetingsColumns(projectId, memberMap, sprintMap),
    [projectId, memberMap, sprintMap],
  );

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={actionItemFilter} onValueChange={setActionItemFilter}>
        <SelectTrigger className="w-40">
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
          className="w-32"
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
          className="w-32"
        />
      ) : null}
      {isFiltered ? (
        <Button size="sm" variant="ghost" className="text-xs" onClick={handleClearFilters}>
          Clear
        </Button>
      ) : null}
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
      className="flex-1 min-h-0"
    />
  ) : (
    <EmptyState
      illustrationPreset="search"
      title="No meetings match your filters"
      description={search ? `No meetings found for "${search}".` : "Try adjusting your filters."}
      action={{ label: "Clear filters", onClick: handleClearFilters }}
      className="flex-1 min-h-0"
    />
  );

  return (
    <PageWrapper
      title="Meetings"
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
          <PmSection index={0} className="shrink-0">
            <NextMeetingStrip
              meeting={nextMeeting}
              projectId={projectId}
              members={projectMembers}
            />
          </PmSection>
        ) : null}

        <PmSection index={nextMeeting ? 1 : 0} className="flex min-h-0 flex-1 flex-col">
          {isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : (
            <PmPanel className={PM_FILL_PANEL}>
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
