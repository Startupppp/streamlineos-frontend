"use client";

import { useMemo, useState, useCallback } from "react";
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
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Combobox } from "@/components/ui/combobox";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { NewMeetingButton, MEETING_TEMPLATES, type MeetingTemplate } from "./new-meeting-button";
import { NextMeetingStrip } from "./next-meeting-strip";
import { buildMeetingsColumns, MEETINGS_TABLE_HEADERS, MeetingMobileCard } from "./meetings-columns";
import { getErrorMessage } from "@/lib/get-error-message";
import { generateAgenda, type AgendaSource } from "./generate-agenda";
import type { Meeting, CreateMeetingInput } from "@/types/projects";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { getUserDisplayName } from "@/lib/person-display";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";

const TYPE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  { value: "meeting", label: "Meeting" },
  { value: "standup", label: "Standup" },
  { value: "retro", label: "Retro" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
];

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any date" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const ACTION_ITEM_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "Any" },
  { value: "has", label: "Has action items" },
  { value: "unresolved", label: "Has unresolved items" },
];

const MEETING_TYPES = ["meeting", "standup", "retro", "planning", "review"] as const;
const MEETING_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
const DATE_FILTER_VALUES = ["today", "this_week", "upcoming", "past"] as const;
const ACTION_ITEM_VALUES = ["has", "unresolved"] as const;

const FILTER_DEFINITIONS = [
  { param: "type", options: MEETING_TYPES },
  { param: "status", options: MEETING_STATUSES },
  { param: "date", options: DATE_FILTER_VALUES },
  { param: "actionItem", options: ACTION_ITEM_VALUES },
  { param: "host" },
  { param: "attendee" },
] as const;

interface MeetingsListPageProps {
  projectId: number;
}

export function MeetingsListPage({ projectId }: MeetingsListPageProps) {
  const canManage = useCan("build:meetings:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const dateValue = listFilters.value("date");
  const actionItemValue = listFilters.value("actionItem");
  const hostId = listFilters.value("host");
  const attendeeId = listFilters.value("attendee");

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
    type: typeValue !== BUILD_FILTER_ALL ? typeValue : undefined,
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    dateFilter:
      dateValue !== BUILD_FILTER_ALL
        ? (dateValue as "today" | "this_week" | "upcoming" | "past")
        : undefined,
    hostId: hostId !== BUILD_FILTER_ALL && hostId ? hostId : undefined,
    attendeeId: attendeeId !== BUILD_FILTER_ALL && attendeeId ? attendeeId : undefined,
    hasActionItems: actionItemValue === "has" ? true : undefined,
    hasUnresolvedActionItems: actionItemValue === "unresolved" ? true : undefined,
  });

  const { data: upcomingMeetings } = useMeetings(projectId, {
    dateFilter: "upcoming",
    status: "scheduled",
  });

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
    const q = listFilters.debouncedSearch.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) => m.title.toLowerCase().includes(q) || `mtg-${m.meetingNumber}`.includes(q),
    );
  }, [data, listFilters.debouncedSearch]);

  const handleOpenSheet = useCallback(() => {
    setSelectedTemplate(null);
    setSheetOpen(true);
  }, []);

  const handleOpenTemplate = useCallback((tpl: MeetingTemplate) => {
    setSelectedTemplate(tpl);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedTemplate(null);
  }, []);

  const handleCreate = useCallback(
    (input: CreateMeetingInput) => {
      createMeeting.mutate(input, {
        onSuccess: () => {
          toast.success("Meeting created");
          setSheetOpen(false);
          setSelectedTemplate(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createMeeting],
  );

  const handleScheduleStandup = useCallback(() => {
    const template = MEETING_TEMPLATES[0];
    if (template) handleOpenTemplate(template);
  }, [handleOpenTemplate]);

  const handleSchedulePlanning = useCallback(() => {
    const template = MEETING_TEMPLATES[1];
    if (template) handleOpenTemplate(template);
  }, [handleOpenTemplate]);

  const handleGenerateAgenda = useCallback(
    (sources: AgendaSource[]): string =>
      generateAgenda({ cycle: activeCycle, tickets, sources }),
    [activeCycle, tickets],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleDateChange = useCallback(
    (value: string) => listFilters.setValue("date", value),
    [listFilters],
  );

  const handleActionItemChange = useCallback(
    (value: string) => listFilters.setValue("actionItem", value),
    [listFilters],
  );

  const handleHostChange = useCallback(
    (value: string) => listFilters.setValue("host", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleAttendeeChange = useCallback(
    (value: string) => listFilters.setValue("attendee", value || BUILD_FILTER_ALL),
    [listFilters],
  );

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

  const renderMobileCard = useCallback(
    (row: Meeting) => (
      <MeetingMobileCard meeting={row} memberMap={memberMap} />
    ),
    [memberMap],
  );

  const hostComboValue = hostId !== BUILD_FILTER_ALL ? hostId : "";
  const attendeeComboValue = attendeeId !== BUILD_FILTER_ALL ? attendeeId : "";

  return (
    <PageWrapper
      title="Meetings"
      subtitle="Schedule meetings, standups, and retros for your project"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search meetings…",
            label: "Search meetings",
          }}
          filters={[
            {
              id: "type",
              label: "Type",
              active: listFilters.isActive("type"),
              control: (
                <BuildFilterSelect
                  label="Type"
                  value={typeValue}
                  onValueChange={handleTypeChange}
                  options={TYPE_OPTIONS}
                />
              ),
            },
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "date",
              label: "Date",
              active: listFilters.isActive("date"),
              control: (
                <BuildFilterSelect
                  label="Date"
                  value={dateValue}
                  onValueChange={handleDateChange}
                  options={DATE_OPTIONS}
                />
              ),
            },
            {
              id: "actionItem",
              label: "Action items",
              active: listFilters.isActive("actionItem"),
              control: (
                <BuildFilterSelect
                  label="Action items"
                  value={actionItemValue}
                  onValueChange={handleActionItemChange}
                  options={ACTION_ITEM_OPTIONS}
                />
              ),
            },
            ...(projectMembers.length > 0
              ? [
                  {
                    id: "host",
                    label: "Host",
                    active: listFilters.isActive("host"),
                    control: (
                      <Combobox
                        options={memberOptions}
                        value={hostComboValue}
                        onChange={handleHostChange}
                        placeholder="Host…"
                        searchPlaceholder="Search hosts…"
                        emptyText="No members"
                        className="w-full md:w-40"
                      />
                    ),
                  },
                  {
                    id: "attendee",
                    label: "Attendee",
                    active: listFilters.isActive("attendee"),
                    control: (
                      <Combobox
                        options={memberOptions}
                        value={attendeeComboValue}
                        onChange={handleAttendeeChange}
                        placeholder="Attendee…"
                        searchPlaceholder="Search attendees…"
                        emptyText="No members"
                        className="w-full md:w-40"
                      />
                    ),
                  },
                ]
              : []),
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
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
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton
                rows={12}
                headers={MEETINGS_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                illustrationPreset={listFilters.isFiltered ? "search" : "calendar"}
                title={listFilters.isFiltered ? "No meetings found" : "No meetings yet"}
                description={
                  listFilters.isFiltered
                    ? undefined
                    : "Keep your team aligned with meetings, standups, and retros. Include agenda, notes, action items, and attendees."
                }
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canManage && !listFilters.isFiltered
                    ? { label: "Schedule Standup", onClick: handleScheduleStandup }
                    : undefined
                }
                secondaryAction={
                  canManage && !listFilters.isFiltered
                    ? { label: "Sprint Planning", onClick: handleSchedulePlanning }
                    : undefined
                }
                className={PM_FILL_PANEL}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              className={PM_FILL_PANEL}
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.id}
              minWidth="1020px"
              mobileCard={renderMobileCard}
              pagination={{ pageSize: 25 }}
            />
          </PageState>
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
