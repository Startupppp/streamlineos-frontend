"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { motion } from "framer-motion";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { api } from "@/trpc/react";
import { RouterOutputs } from "@/lib/trpc";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { TimeEntryDetailSheet } from "@/components/timesheets/time-entry-detail-sheet";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import { resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import {
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Users,
  FolderOpen,
  TrendingUp,
  Plus,
  MoreVertical,
} from "lucide-react";

type TimesheetEntry = RouterOutputs["project"]["getAllTeamTimesheets"][number];

const ITEMS_PER_PAGE = 10;

const statusBadgeStyles: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type ViewMode = "day" | "week" | "month";

const WeeklyProductivityChart = memo(function WeeklyProductivityChart({
  timesheets,
  totalHours,
  prevWeekHours,
}: {
  timesheets: TimesheetEntry[] | undefined;
  totalHours: number;
  prevWeekHours: number;
}) {
  const dailyHours = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayMap = new Map<string, number>();
    days.forEach((d) => dayMap.set(d, 0));

    if (timesheets) {
      timesheets.forEach((entry) => {
        const dayName = format(new Date(entry.date), "EEE");
        const shortDay = dayName.slice(0, 3);
        if (dayMap.has(shortDay)) {
          dayMap.set(shortDay, (dayMap.get(shortDay) || 0) + parseFloat(entry.hours || "0"));
        }
      });
    }

    const maxHours = Math.max(...Array.from(dayMap.values()), 1);
    return days.map((day) => ({
      label: day,
      hours: dayMap.get(day) || 0,
      percent: Math.round(((dayMap.get(day) || 0) / maxHours) * 100),
    }));
  }, [timesheets]);

  const percentChange = prevWeekHours > 0
    ? (((totalHours - prevWeekHours) / prevWeekHours) * 100).toFixed(1)
    : null;

  const formatHoursMinutes = (h: number): string => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base font-bold">Weekly Productivity Summary</CardTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-2xl font-black tracking-tight">{formatHoursMinutes(totalHours)}</span>
              {percentChange !== null && (
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold ${
                    parseFloat(percentChange) >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                  }`}
                >
                  {parseFloat(percentChange) >= 0 ? "+" : ""}
                  {percentChange}% vs last week
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between h-48 px-2 gap-3 mt-2">
          {dailyHours.map((day) => (
            <div key={day.label} className="flex flex-col items-center flex-1 gap-2 group">
              <div className="w-full bg-muted rounded-t relative h-40">
                <div
                  className="absolute bottom-0 w-full bg-primary/30 group-hover:bg-primary transition-all duration-200 rounded-t"
                  style={{ height: `${Math.max(day.percent, 2)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

const ViewSettingsCard = memo(function ViewSettingsCard({
  viewMode,
  onViewModeChange,
  selectedEmployee,
  onEmployeeChange,
  selectedProject,
  onProjectChange,
  selectedStatus,
  onStatusChange,
  employees,
  projects,
  calendarMonth,
  onCalendarMonthChange,
  onDateSelect,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedEmployee: string;
  onEmployeeChange: (val: string) => void;
  selectedProject: string;
  onProjectChange: (val: string) => void;
  selectedStatus: string;
  onStatusChange: (val: string) => void;
  employees: { id: string; firstName: string | null; lastName: string | null }[] | undefined;
  projects: { id: number; name: string }[] | undefined;
  calendarMonth: Date;
  onCalendarMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
}) {
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const startDow = getDay(startOfMonth(calendarMonth));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          View Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex p-1 bg-muted rounded-lg">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                viewMode === mode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Employee</label>
            <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Project</label>
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((proj) => (
                <SelectItem key={proj.id} value={proj.id.toString()}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">{format(calendarMonth, "MMMM yyyy")}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onCalendarMonthChange(subMonths(calendarMonth, 1))}
                className="size-6 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onCalendarMonthChange(addMonths(calendarMonth, 1))}
                className="size-6 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={`${d}-${i}`} className="text-[10px] font-bold text-muted-foreground">{d}</span>
            ))}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {calendarDays.map((date) => {
              const isTodayDate = isToday(date);
              return (
                <button
                  key={date.getDate()}
                  onClick={() => onDateSelect(date)}
                  className={`h-6 text-[10px] flex items-center justify-center rounded-full transition-colors ${
                    isTodayDate
                      ? "bg-primary text-white font-bold"
                      : "hover:bg-primary/10"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const StatsCards = memo(function StatsCards({
  totalHours,
  uniqueEmployees,
  uniqueProjects,
  avgHoursPerDay,
  entryCount,
}: {
  totalHours: number;
  uniqueEmployees: number;
  uniqueProjects: number;
  avgHoursPerDay: number;
  entryCount: number;
}) {
  const cards = [
    { title: "Total Hours", value: `${totalHours.toFixed(1)}h`, sub: `Across ${entryCount} entries`, icon: Clock },
    { title: "Employees", value: String(uniqueEmployees), sub: "Team members logged time", icon: Users },
    { title: "Projects", value: String(uniqueProjects), sub: "Active projects worked on", icon: FolderOpen },
    { title: "Avg Hours/Day", value: `${avgHoursPerDay.toFixed(1)}h`, sub: "Average per working day", icon: TrendingUp },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

export default function TeamTimesheetsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const dateRange = useMemo(() => {
    const today = new Date();
    switch (viewMode) {
      case "day":
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
      case "week":
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
    }
  }, [viewMode]);

  const prevWeekRange = useMemo(() => {
    const today = new Date();
    const prevStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    const prevEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
    return { start: format(prevStart, "yyyy-MM-dd"), end: format(prevEnd, "yyyy-MM-dd") };
  }, []);

  const { data: timesheets, isLoading } = api.project.getAllTeamTimesheets.useQuery({
    userId: selectedEmployee === "all" ? undefined : selectedEmployee,
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: selectedStatus === "all" ? undefined : (selectedStatus as "PENDING" | "APPROVED" | "REJECTED"),
  });

  const { data: prevWeekTimesheets } = api.project.getAllTeamTimesheets.useQuery({
    startDate: prevWeekRange.start,
    endDate: prevWeekRange.end,
  });

  const { data: employees } = api.hr.getEmployees.useQuery();
  const { data: projects } = api.project.getProjects.useQuery();

  const statistics = useMemo(() => {
    if (!timesheets) return { totalHours: 0, uniqueEmployees: 0, uniqueProjects: 0, avgHoursPerDay: 0 };
    const totalHours = timesheets.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0);
    const uniqueEmployees = new Set(timesheets.map((e) => e.userId)).size;
    const uniqueProjects = new Set(
      timesheets.filter((e) => e.ticket?.projectId).map((e) => e.ticket!.projectId)
    ).size;
    const uniqueDates = new Set(timesheets.map((e) => e.date)).size;
    const avgHoursPerDay = uniqueDates > 0 ? totalHours / uniqueDates : 0;
    return { totalHours, uniqueEmployees, uniqueProjects, avgHoursPerDay };
  }, [timesheets]);

  const prevWeekHours = useMemo(() => {
    if (!prevWeekTimesheets) return 0;
    return prevWeekTimesheets.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0);
  }, [prevWeekTimesheets]);

  const paginatedEntries = useMemo(() => {
    if (!timesheets) return [];
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    return timesheets.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [timesheets, page]);

  const totalPages = timesheets ? Math.ceil(timesheets.length / ITEMS_PER_PAGE) : 0;

  const exportToCSV = useCallback(() => {
    if (!timesheets || timesheets.length === 0) return;
    const headers = ["Employee", "Date", "Project", "Ticket", "Hours", "Description", "Status"];
    const rows = timesheets.map((entry) => [
      `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`.trim(),
      format(new Date(entry.date), "yyyy-MM-dd"),
      entry.ticket?.project?.name || "N/A",
      entry.ticketId ? `#${entry.ticketId}` : "N/A",
      entry.hours || "0",
      entry.description || "",
      entry.status || "PENDING",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-timesheets-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [timesheets]);

  const handleEntryClick = useCallback((entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setDetailSheetOpen(true);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setViewMode("day");
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Work Logs"
        description="Monitor team efficiency and task allocation for HR performance reviews."
        actions={
          <LogTimeDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Log
              </Button>
            }
          />
        }
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WeeklyProductivityChart
            timesheets={timesheets}
            totalHours={statistics.totalHours}
            prevWeekHours={prevWeekHours}
          />
          <ViewSettingsCard
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedEmployee={selectedEmployee}
            onEmployeeChange={setSelectedEmployee}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            employees={employees}
            projects={projects}
            calendarMonth={calendarMonth}
            onCalendarMonthChange={setCalendarMonth}
            onDateSelect={handleDateSelect}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <StatsCards
            totalHours={statistics.totalHours}
            uniqueEmployees={statistics.uniqueEmployees}
            uniqueProjects={statistics.uniqueProjects}
            avgHoursPerDay={statistics.avgHoursPerDay}
            entryCount={timesheets?.length || 0}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold">Recent Log Entries</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={exportToCSV}
                    disabled={!timesheets || timesheets.length === 0}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <caption className="sr-only">Team timesheet entries</caption>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4">Employee</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4">Project</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4">Task Description</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4">Duration</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4 text-center">Status</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-6 py-4 w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEntries.length > 0 ? (
                          paginatedEntries.map((entry) => (
                            <TableRow
                              key={entry.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => handleEntryClick(entry)}
                            >
                              <TableCell className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={resolveImageUrl(entry.user?.image)} />
                                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                      {entry.user?.firstName?.[0]}
                                      {entry.user?.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-semibold">
                                    {entry.user?.firstName} {entry.user?.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap">
                                {entry.ticket?.project?.name ? (
                                  <Badge variant="secondary" className="font-medium text-xs">
                                    {entry.ticket.project.name}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4 max-w-xs">
                                <p className="text-sm text-muted-foreground truncate">
                                  {entry.description || "No description provided"}
                                </p>
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-bold">{entry.hours || "0"}h</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-center">
                                <Badge
                                  className={`text-[10px] font-bold uppercase tracking-wide border-0 ${
                                    statusBadgeStyles[entry.status || "PENDING"]
                                  }`}
                                >
                                  {entry.status || "PENDING"}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEntryClick(entry);
                                  }}
                                  className="p-1 hover:text-primary transition-colors"
                                  aria-label="View details"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                <EmptyTimeIllustration />
                                <p>No time entries found for this period.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {timesheets && timesheets.length > 0 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
                        {Math.min(page * ITEMS_PER_PAGE, timesheets.length)} of {timesheets.length} logs
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
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
        </motion.div>
      </motion.div>

      <TimeEntryDetailSheet
        entry={selectedEntry}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
