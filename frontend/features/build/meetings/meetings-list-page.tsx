"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useMeetings } from "@/hooks/api/build/meetings";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectBoardTickets } from "@/hooks/api/build/tickets";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { NewMeetingButton } from "./new-meeting-button";
import { NextMeetingStrip } from "./next-meeting-strip";
import { buildMeetingsColumns, MEETINGS_TABLE_HEADERS, MeetingMobileCard } from "./meetings-columns";
import { generateAgenda, type AgendaSource } from "./generate-agenda";
import type { Meeting } from "@/types/projects";
import {
  PmPageShell,
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { getUserDisplayName } from "@/lib/person-display";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { MeetingsListFilters, FILTER_DEFINITIONS } from "./meetings-list-filters";
import { useMeetingCreate } from "./use-meeting-create";

interface MeetingsListPageProps {
  projectId: number;
}

export function MeetingsListPage({ projectId }: MeetingsListPageProps) {
  const meetingTriggerRef = useRef<HTMLButtonElement>(null);
  const canManage = useCan("build:meetings:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const dateValue = listFilters.value("date");
  const actionItemValue = listFilters.value("actionItem");
  const hostId = listFilters.value("host");
  const attendeeId = listFilters.value("attendee");

  const {
    sheetOpen,
    selectedTemplate,
    createMeeting,
    handleOpenSheet,
    handleOpenTemplate,
    handleSheetOpenChange,
    handleCreate,
    handleScheduleStandup,
    handleSchedulePlanning,
  } = useMeetingCreate({ projectId });

  const { data: projectMembersPage } = useProjectMembers(projectId);
  const projectMembers = useMemo(
    () => projectMembersPage?.data ?? [],
    [projectMembersPage],
  );
  const { data: cycles = [] } = useCycles(projectId);
  const { data: boardTickets } = useProjectBoardTickets(projectId);
  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.status === "active") ?? null,
    [cycles],
  );

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useMeetings(projectId, {
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
    q: listFilters.debouncedSearch || undefined,
  });

  const { data: upcomingData } = useMeetings(projectId, {
    dateFilter: "upcoming",
    status: "scheduled",
  });

  const upcomingMeetings = useMemo(
    () => upcomingData?.pages.flatMap((p) => p.data) ?? [],
    [upcomingData],
  );

  const nextMeeting = useMemo(() => {
    if (upcomingMeetings.length === 0) return null;
    return upcomingMeetings.reduce<Meeting | null>((nearest, m) => {
      if (!m.scheduledAt) return nearest;
      if (!nearest || !nearest.scheduledAt) return m;
      return new Date(m.scheduledAt) < new Date(nearest.scheduledAt) ? m : nearest;
    }, null);
  }, [upcomingMeetings]);

  const meetings = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const handleGenerateAgenda = useCallback(
    (sources: AgendaSource[]): string =>
      generateAgenda({ cycle: activeCycle, tickets, sources }),
    [activeCycle, tickets],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

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

  return (
    <PageWrapper
      title="Meetings"
      subtitle="Schedule meetings, standups, and retros for your project"
      filters={
        <MeetingsListFilters listFilters={listFilters} memberOptions={memberOptions} />
      }
      actions={
        canManage ? (
          <NewMeetingButton
            onBlank={handleOpenSheet}
            onTemplate={handleOpenTemplate}
            triggerRef={meetingTriggerRef}
          />
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
          <BuildListSurface<Meeting>
            permission="build:meetings:view"
            rows={meetings}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="1020px"
            mobileCard={renderMobileCard}
            loadingHeaders={MEETINGS_TABLE_HEADERS}
            loadingRows={12}
            isFetchingMore={isFetchingNextPage}
            footer={
              <InfiniteScrollSentinel
                hasNextPage={hasNextPage ?? false}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                label="Load more meetings"
              />
            }
            empty={
              <EmptyState
                illustrationPreset="calendar"
                title="No meetings yet"
                description="Keep your team aligned with meetings, standups, and retros. Include agenda, notes, action items, and attendees."
                action={
                  canManage
                    ? { label: "Schedule Standup", onClick: handleScheduleStandup }
                    : undefined
                }
                secondaryAction={
                  canManage
                    ? { label: "Cycle Planning", onClick: handleSchedulePlanning }
                    : undefined
                }
                className={CONTENT_FILL_PANEL}
              />
            }
            filteredEmpty={
              <EmptyState
                illustrationPreset="search"
                title="No meetings found"
                onClearFilters={listFilters.clearAll}
                className={CONTENT_FILL_PANEL}
              />
            }
            onRetry={handleRetry}
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
        returnFocusRef={meetingTriggerRef}
      />
    </PageWrapper>
  );
}
