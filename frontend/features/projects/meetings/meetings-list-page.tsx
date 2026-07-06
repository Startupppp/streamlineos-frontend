"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useMeetings, useCreateMeeting } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeetingTypeBadge, MeetingStatusBadge } from "./meeting-badges";
import { MeetingFormSheet } from "./meeting-form-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Meeting, CreateMeetingInput } from "@/types/projects";

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

interface MeetingsListPageProps {
  projectId: number;
}

export function MeetingsListPage({ projectId }: MeetingsListPageProps) {
  const canManage = useCan("projects:meetings:manage");

  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useMeetings(projectId, {
    type: typeFilter !== "all" ? typeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

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

  function handleCreate(input: CreateMeetingInput) {
    createMeeting.mutate(input, {
      onSuccess: () => { toast.success("Meeting created"); setSheetOpen(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const columns: DataTableColumn<Meeting>[] = [
    {
      key: "meetingNumber",
      header: "ID",
      className: "w-24",
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
        <Link
          href={`/projects/${projectId}/meetings/${row.id}`}
          className="font-medium text-foreground hover:text-primary truncate max-w-[260px] block"
        >
          {row.title}
        </Link>
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
      header: "Scheduled",
      sortable: true,
      sortValue: (row) => row.scheduledAt ?? "",
      cell: (row) =>
        row.scheduledAt ? (
          <span className="text-sm text-muted-foreground tabular-nums">
            {new Date(row.scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "attendeeCount",
      header: "Attendees",
      className: "w-24",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.attendeeCount ?? "—"}
        </span>
      ),
    },
    {
      key: "actionItemCount",
      header: "Actions",
      className: "w-24",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.actionItemCount ?? "—"}
        </span>
      ),
    },
  ];

  const isFiltered = typeFilter !== "all" || statusFilter !== "all" || !!search.trim();

  return (
    <PageWrapper
      title="Meetings"
      eyebrow="Project"
      subtitle={`${displayed.length} meeting${displayed.length === 1 ? "" : "s"}`}
      actions={
        canManage ? (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Meeting
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs w-52"
            placeholder="Search meetings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isFiltered && (
            <Button size="sm" variant="ghost" className="h-8 text-xs"
              onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setSearch(""); }}>
              Clear
            </Button>
          )}
        </div>
      }
    >
      <div className="px-4 pb-4">
        {isLoading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : isError ? (
          <ErrorState className="flex-1" onRetry={() => void refetch()} />
        ) : displayed.length === 0 ? (
          <EmptyState
            illustrationPreset="calendar"
            title={isFiltered ? "No matching meetings" : "No meetings yet"}
            description={
              isFiltered
                ? "Try adjusting your filters."
                : "Schedule meetings, standups, and retros to keep your team aligned."
            }
            action={
              isFiltered
                ? { label: "Clear filters", onClick: () => { setTypeFilter("all"); setStatusFilter("all"); setSearch(""); } }
                : canManage
                  ? { label: "New Meeting", onClick: () => setSheetOpen(true) }
                  : undefined
            }
          />
        ) : (
          <DataTable data={displayed} columns={columns} getRowKey={(row) => row.id} minWidth="760px" />
        )}
      </div>

      <MeetingFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode="create"
        onSubmitCreate={handleCreate}
        onSubmitEdit={() => undefined}
        isPending={createMeeting.isPending}
      />
    </PageWrapper>
  );
}
