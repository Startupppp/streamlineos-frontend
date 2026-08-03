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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Wifi, WifiOff, Coffee, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHrTeamAttendanceStatus, useHrDepartments } from "@/hooks/api/hr";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { TeamAttendanceEntry } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";

type StatusFilter = TeamAttendanceEntry["status"] | "ALL";

const STATUS_META: Record<
  TeamAttendanceEntry["status"],
  { label: string; tone: string; Icon: typeof Wifi }
> = {
  PRESENT: {
    label: "Present",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    Icon: Wifi,
  },
  ON_BREAK: {
    label: "On Break",
    tone: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    Icon: Coffee,
  },
  CHECKED_OUT: {
    label: "Checked Out",
    tone: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    Icon: LogOut,
  },
  OFFLINE: {
    label: "Offline",
    tone: "bg-muted text-muted-foreground border-transparent",
    Icon: WifiOff,
  },
};

const SUMMARY_TONES: Record<TeamAttendanceEntry["status"], string> = {
  PRESENT: "text-emerald-600",
  ON_BREAK: "text-amber-600",
  CHECKED_OUT: "text-blue-600",
  OFFLINE: "text-muted-foreground",
};

function StatusBadge({ status }: { status: TeamAttendanceEntry["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <Badge className={cn("gap-1 text-[10px] font-medium", meta.tone)}>
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
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {entry.department ? (
            <TruncatedText text={entry.department} className="text-[11px] text-muted-foreground" />
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
          <span className="text-[10px] tabular-nums text-muted-foreground">
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
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const { data, isLoading } = useHrTeamAttendanceStatus({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    departmentId: departmentFilter === "ALL" ? undefined : departmentFilter,
  });
  const { data: departmentsData } = useHrDepartments();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const handleDepartmentChange = useCallback((value: string) => {
    setDepartmentFilter(value);
    setPage(1);
  }, []);
  const handleStatusChange = useCallback((status: TeamAttendanceEntry["status"]) => {
    setStatusFilter((prev) => (prev === status ? "ALL" : status));
    setPage(1);
  }, []);
  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => p + 1), []);

  const departments = useMemo(
    () => [...(departmentsData ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departmentsData],
  );

  const entries = data?.data ?? [];
  const counts = data?.counts;
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const listMaxClass = expanded ? "max-h-[min(70dvh,36rem)]" : "max-h-72";

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)]">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          Team Attendance — Today
          {pagination && (
            <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
              {pagination.total} member{pagination.total === 1 ? "" : "s"}
            </span>
          )}
        </CardTitle>

        {isLoading ? (
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 py-1">
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
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            illustrationPreset="team"
            title="No teammates match"
            description={
              search || statusFilter !== "ALL" || departmentFilter !== "ALL"
                ? "Try clearing search or filters."
                : "No team attendance data for today yet."
            }
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
            {pagination && totalPages > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={pagination.page <= 1}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={pagination.page >= totalPages}
                    onClick={handleNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
