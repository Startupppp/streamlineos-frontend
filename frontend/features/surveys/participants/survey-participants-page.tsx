"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserPlusIcon, SendIcon, BellIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  useParticipants,
  useInviteParticipants,
  useRemindParticipants,
  type SurveyParticipant,
  type ParticipantStatus,
} from "@/hooks/api/surveys/participants";
import { ParticipantStatusBadge } from "@/features/surveys/participants/participant-status-badge";
import { AddParticipantsDialog } from "@/features/surveys/participants/add-participants-dialog";

interface SurveyParticipantsPageProps {
  surveyId: string;
}

export function SurveyParticipantsPage({ surveyId: surveyIdParam }: SurveyParticipantsPageProps) {
  const surveyId = Number(surveyIdParam);

  const [status, setStatus] = useState<ParticipantStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const { data: participantsPage, isLoading, isError, error, refetch } = useParticipants(surveyId, {
    status: status === "all" ? undefined : status,
    page,
  });

  const participants = participantsPage?.items ?? [];
  const total = participantsPage?.total ?? 0;
  const pageSize = participantsPage?.pageSize ?? 50;
  const invite = useInviteParticipants(surveyId);
  const remind = useRemindParticipants(surveyId);

  const columns: DataTableColumn<SurveyParticipant>[] = useMemo(
    () => [
      { key: "name", header: "Name", cell: (row) => row.name || row.email || "—" },
      { key: "email", header: "Email", cell: (row) => row.email || "—" },
      { key: "status", header: "Status", cell: (row) => <ParticipantStatusBadge status={row.status} /> },
      { key: "invitedAt", header: "Invited", cell: (row) => formatShortDate(row.invitedAt) || "—" },
      { key: "completedAt", header: "Completed", cell: (row) => formatShortDate(row.completedAt) || "—" },
    ],
    [],
  );

  function handleRetry() {
    void refetch();
  }

  function handleStatusChange(value: string) {
    setStatus(value as ParticipantStatus | "all");
    setPage(1);
  }

  function handleOpenAdd() {
    setAddOpen(true);
  }

  function handleClearFilters() {
    setStatus("all");
    setPage(1);
  }

  async function handleInvite() {
    if (selected.size === 0) return;
    try {
      await invite.mutateAsync(Array.from(selected, Number));
      toast.success("Invitations sent");
      setSelected(new Set());
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleRemind() {
    if (selected.size === 0) return;
    try {
      await remind.mutateAsync(Array.from(selected, Number));
      toast.success("Reminders sent");
      setSelected(new Set());
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const hasActiveFilters = status !== "all";
  const pageState = usePageState({
    permission: "surveys:participants:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && participants.length === 0,
    hasActiveFilters,
  });

  const emptyNode = (
    <EmptyState
      title="No participants yet"
      description="Add participants by email to invite them to this survey."
      action={{ label: "Add participants", onClick: handleOpenAdd }}
      filtersActive={hasActiveFilters}
      filteredTitle="No participants match this status"
      onClearFilters={handleClearFilters}
      className="h-full min-h-full flex-1"
    />
  );

  return (
    <DashboardGate permission="surveys:participants:view">
      <RequireModule module="surveys">
        <PageWrapper
          title="Participants"
          subtitle="Invite people and track who has started or finished."
          backHref={`/surveys/${surveyId}`}
          noInternalScroll
          contentClassName="flex min-h-0 flex-1 flex-col"
          actionsInline
          state={pageState}
          loading={
            <DataTableSkeleton
              rows={8}
              headers={["Name", "Email", "Status", "Invited", "Completed"]}
              fill
            />
          }
          empty={emptyNode}
          onRetry={handleRetry}
          onClearFilters={handleClearFilters}
          stateViews={{
            error: (
              <ErrorState
                className="h-full min-h-full flex-1"
                title="Couldn't load participants"
                description="Failed to load survey participants. Please try again."
                onRetry={handleRetry}
              />
            ),
          }}
          extraActions={
            <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AnimatedIconButton
                icon={UserPlusIcon}
                iconSize={14}
                iconClassName="mr-1.5"
                size="sm"
                className="h-9 shrink-0"
                onClick={handleOpenAdd}
              >
                Add participants
              </AnimatedIconButton>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger
                  className={cn(
                    FILTER_SELECT_TRIGGER,
                    "w-auto max-w-[11rem] shrink-0 sm:w-40 sm:max-w-none",
                  )}
                  aria-label="Status"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
              {selected.size > 0 ? (
                <>
                  <AnimatedIconButton
                    icon={SendIcon}
                    iconSize={14}
                    iconClassName="mr-1.5"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={handleInvite}
                    disabled={invite.isPending}
                  >
                    Invite ({selected.size})
                  </AnimatedIconButton>
                  <AnimatedIconButton
                    icon={BellIcon}
                    iconSize={14}
                    iconClassName="mr-1.5"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={handleRemind}
                    disabled={remind.isPending}
                  >
                    Remind ({selected.size})
                  </AnimatedIconButton>
                </>
              ) : null}
            </div>
          }
        >
          <DataTable
            className="h-full min-h-0 flex-1"
            data={participants}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={false}
            selection={{
              selected,
              onChange: setSelected,
              getRowLabel: (row) => row.name ?? row.email ?? "",
            }}
            pagination={{ mode: "server", page, pageSize, total, onPageChange: setPage }}
            emptyState={emptyNode}
          />
        </PageWrapper>
        <AddParticipantsDialog surveyId={surveyId} open={addOpen} onOpenChange={setAddOpen} />
      </RequireModule>
    </DashboardGate>
  );
}
