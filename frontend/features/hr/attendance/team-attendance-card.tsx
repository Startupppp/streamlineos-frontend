"use client";

import { memo, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Wifi, WifiOff, Coffee, LogOut } from "lucide-react";
import { useHrTeamAttendanceStatus, useHrDepartments } from "@/hooks/api/hr";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { TeamAttendanceEntry } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";

type StatusFilter = TeamAttendanceEntry["status"] | "ALL";

const STATUS_META: Record<
  TeamAttendanceEntry["status"],
  { label: string; tone: string; Icon: typeof Wifi }
> = {
  PRESENT: {
    label: "Present",
    tone: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    Icon: Wifi,
  },
  ON_BREAK: {
    label: "On Break",
    tone: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    Icon: Coffee,
  },
  CHECKED_OUT: {
    label: "Checked Out",
    tone: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    Icon: LogOut,
  },
  OFFLINE: {
    label: "Offline",
    tone: "bg-muted text-muted-foreground border-transparent",
    Icon: WifiOff,
  },
};

const SUMMARY_TONES: Record<TeamAttendanceEntry["status"], string> = {
  PRESENT: "text-status-success-ink",
  ON_BREAK: "text-status-warning-ink",
  CHECKED_OUT: "text-status-info-ink",
  OFFLINE: "text-muted-foreground",
};

function StatusBadge({ status }: { status: TeamAttendanceEntry["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <Badge className={cn("gap-1 text-micro font-medium", meta.tone)}>
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </Badge>
  );
}

function MemberRow({ entry }: { entry: TeamAttendanceEntry }) {
  return (
    <Link
      href={`/hr/employees/${entry.userId}`}
      className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar className="h-9 w-9 shrink-0">
        {entry.image && <AvatarImage src={resolveImageUrl(entry.image)} alt="" />}
        <AvatarFallback className="text-xs">{getInitials(entry.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText
          text={entry.name}
          className="text-sm font-medium hover:underline"
        />
        <div className="flex min-w-0 items-center gap-1.5 text-dense text-muted-foreground">
          {entry.department ? (
            <TruncatedText text={entry.department} className="text-dense text-muted-foreground" />
          ) : (
            <span>No department</span>
          )}
          {entry.workHours && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums shrink-0">{entry.workHours}h</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <StatusBadge status={entry.status} />
        {entry.checkIn && (
          <span className="text-micro tabular-nums text-muted-foreground">
            In {format(new Date(entry.checkIn), "h:mm a")}
            {entry.checkOut
              ? ` · Out ${format(new Date(entry.checkOut), "h:mm a")}`
              : ""}
          </span>
        )}
      </div>
    </Link>
  );
}

const PAGE_SIZE = 50;

export const TeamAttendanceCard = memo(function TeamAttendanceCard({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([
    undefined,
  ]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, error, isLoading, refetch } = useHrTeamAttendanceStatus({
    cursor,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    departmentId: departmentFilter === "ALL" ? undefined : departmentFilter,
  });
  const { data: departmentsData } = useHrDepartments();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCursorHistory([undefined]);
  }, []);
  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentFilter(value);
    setCursorHistory([undefined]);
  }, []);
  const handleStatusChange = useCallback((status: TeamAttendanceEntry["status"]) => {
    setStatusFilter((prev) => (prev === status ? "ALL" : status));
    setCursorHistory([undefined]);
  }, []);

  const filtersActive =
    search.trim() !== "" || statusFilter !== "ALL" || departmentFilter !== "ALL";

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setCursorHistory([undefined]);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) =>
      history.length > 1 ? history.slice(0, -1) : history,
    );
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) {
      setCursorHistory((history) => [...history, nextCursor]);
    }
  }, [data?.pagination.nextCursor]);

  const departments = useMemo(
    () => [...(departmentsData ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departmentsData],
  );

  const entries = data?.data ?? [];
  const counts = data?.counts;
  const pagination = data?.pagination;

  const listMaxClass = expanded ? "max-h-[min(70dvh,36rem)]" : "max-h-72";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="shrink-0 border-b px-4 pb-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Team Attendance — Today
          {pagination && (
            <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
              {pagination.total} member{pagination.total === 1 ? "" : "s"}
            </span>
          )}
        </CardTitle>

        {isLoading ? (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, skeletonIndex) => (
              <div
                key={skeletonIndex}
                className="flex flex-col items-center gap-1.5 py-1"
              >
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        ) : counts ? (
          <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-muted/30 p-1.5 md:grid-cols-4">
            {(
              [
                "PRESENT",
                "ON_BREAK",
                "CHECKED_OUT",
                "OFFLINE",
              ] as TeamAttendanceEntry["status"][]
            ).map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors",
                    active
                      ? "bg-background shadow-sm ring-1 ring-border"
                      : "hover:bg-background/70",
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums leading-none",
                      SUMMARY_TONES[status],
                    )}
                  >
                    {counts[status]}
                  </span>
                  <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                    {STATUS_META[status].label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-col gap-3 pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            className="min-w-0 flex-1"
            placeholder="Search name or email…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="h-9 w-full sm:w-[160px]" size="sm">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, skeletonIndex) => (
              <Skeleton
                key={skeletonIndex}
                className="h-14 w-full rounded-lg"
              />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Unable to load team attendance"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
            compact
          />
        ) : entries.length === 0 ? (
          <EmptyState
            illustrationPreset="team"
            title="No team attendance yet"
            description={filtersActive ? undefined : "No team attendance data for today yet."}
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
            compact
          />
        ) : (
          <>
            <ScrollArea className={cn("rounded-xl border border-border/60", listMaxClass)}>
              <div className="divide-y divide-border/60 p-1">
                {entries.map((entry) => (
                  <MemberRow key={entry.userId} entry={entry} />
                ))}
              </div>
            </ScrollArea>
            {pagination && (page > 1 || pagination.hasMore) ? (
              <CursorPageControls
                page={page}
                hasNext={pagination.hasMore}
                disabled={isLoading}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
});
