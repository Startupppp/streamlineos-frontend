"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  useMeetings,
  useCreateMeeting,
  useProjectMembers,
  useCycles,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
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
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import { useSearchParams } from "next/navigation";
import { useBuildListUrlState } from "@/features/build/shared/use-build-list-url-state";

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
  const canManage = useCan("build:meetings:manage");

  const searchParams = useSearchParams();
  const { setListParams, clearFilters } = useBuildListUrlState();

  const typeFilter = searchParams.get("meetingType") ?? "all";
  const statusFilter = searchParams.get("meetingStatus") ?? "all";
  const dateFilter = searchParams.get("dateFilter") ?? "all";
  const hostId = searchParams.get("hostId") ?? "";
  const attendeeId = searchParams.get("attendeeId") ?? "";
  const actionItemFilter = searchParams.get("actionItems") ?? "all";
  const searchFromUrl = searchParams.get("q") ?? "";

  const [rawSearch, setRawSearch] = useState(searchFromUrl);
  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    setListParams({ q: debouncedSearch || null });
  }, [debouncedSearch, searchParams, setListParams]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplate | null>(null);

  const { data: projectMembers = [] } = useProjectMembers(projectId);
  const { data: cycles = [] } = useCycles(projectId);
  const { data: boardTickets } = useProjectBoardTickets(projectId);
  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.status === "active") ?? null,
    [cycles],
  );

  const { data, isLoading, isError, error, refetch } = useMeetings(projectId, {
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
    if (!searchFromUrl.trim()) return meetings;
    const q = searchFromUrl.toLowerCase();
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        `mtg-${m.meetingNumber}`.includes(q),
    );
  }, [data, searchFromUrl]);

  const isFiltered =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    !!hostId ||
    !!attendeeId ||
    actionItemFilter !== "all" ||
    !!searchFromUrl.trim();

  const handleSearchChange = useCallback((value: string) => {
    setRawSearch(value);
  }, []);

  const handleTypeFilterChange = useCallback((value: string) => {
    setListParams({ meetingType: value === "all" ? null : value });
  }, [setListParams]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setListParams({ meetingStatus: value === "all" ? null : value });
  }, [setListParams]);

  const handleDateFilterChange = useCallback((value: string) => {
    setListParams({ dateFilter: value === "all" ? null : value });
  }, [setListParams]);

  const handleHostIdChange = useCallback((value: string) => {
    setListParams({ hostId: value || null });
  }, [setListParams]);

  const handleAttendeeIdChange = useCallback((value: string) => {
    setListParams({ attendeeId: value || null });
  }, [setListParams]);

  const handleActionItemFilterChange = useCallback((value: string) => {
    setListParams({ actionItems: value === "all" ? null : value });
  }, [setListParams]);

  const handleClearFilters = useCallback(() => {
    setRawSearch("");
    clearFilters();
    setListParams({ meetingType: null, meetingStatus: null, dateFilter: null, hostId: null, attendeeId: null, actionItems: null });
  }, [clearFilters, setListParams]);

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
    const template = MEETING_TEMPLATES[0];
    if (template) handleOpenTemplate(template);
  }

  function handleSchedulePlanning() {
    const template = MEETING_TEMPLATES[1];
    if (template) handleOpenTemplate(template);
  }

  const handleGenerateAgenda = useCallback(
    (sources: AgendaSource[]): string =>
      generateAgenda({ cycle: activeCycle, tickets, sources }),
    [activeCycle, tickets],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pageState = usePageState({ permission: "build:meetings:view", isLoading, isError, error });

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

  const cycleMap = useMemo(
    () => new Map(cycles.map((c) => [c.id, c])),
    [cycles],
  );

  const columns = useMemo(
    () => buildMeetingsColumns(projectId, memberMap, cycleMap),
    [projectId, memberMap, cycleMap],
  );

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        value={rawSearch}
        onValueChange={handleSearchChange}
        placeholder="Search meetings…"
        className="min-w-[12rem] sm:max-w-xs"
      />
      <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={dateFilter} onValueChange={handleDateFilterChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={actionItemFilter} onValueChange={handleActionItemFilterChange}>
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
          onChange={handleHostIdChange}
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
          onChange={handleAttendeeIdChange}
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
      title="No meetings found"
      filtersActive={isFiltered}
      onClearFilters={handleClearFilters}
      className="flex-1 min-h-0"
    />
  );

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Meetings" subtitle="Schedule meetings, standups, and retros for your project">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

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
          <DataTable
            className={PM_FILL_PANEL}
            data={displayed}
            columns={columns}
            getRowKey={(row) => row.id}
            minWidth="1020px"
            isLoading={pageState.kind === "loading"}
            emptyState={emptyStateNode}
          />
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
        hasActiveCycle={!!activeCycle}
      />
    </PageWrapper>
  );
}
