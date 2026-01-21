"use client";

import { api } from "@/trpc/react";
import { RouterOutputs } from "@/lib/trpc";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { useState, useMemo } from "react";
import { Loader2, Download, Users, Clock, FolderOpen, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimeEntryDetailSheet } from "@/components/timesheets/time-entry-detail-sheet";

type TimesheetEntry = RouterOutputs["project"]["getAllTeamTimesheets"][number];

export default function TeamTimesheetsPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: timesheets, isLoading } = api.project.getAllTeamTimesheets.useQuery({
    userId: selectedEmployee === "all" ? undefined : selectedEmployee,
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: selectedStatus === "all" ? undefined : selectedStatus as "PENDING" | "APPROVED" | "REJECTED",
  });

  const { data: employees } = api.hr.getEmployees.useQuery();
  const { data: projects } = api.project.getProjects.useQuery();

  const handleEntryClick = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setDetailSheetOpen(true);
  };

  const statistics = useMemo(() => {
    if (!timesheets) return { totalHours: 0, uniqueEmployees: 0, uniqueProjects: 0, avgHoursPerDay: 0 };

    const totalHours = timesheets.reduce((sum, entry) => sum + parseFloat(entry.hours || "0"), 0);
    const uniqueEmployees = new Set(timesheets.map((e) => e.userId)).size;
    const uniqueProjects = new Set(
      timesheets.filter((e) => e.ticket?.projectId).map((e) => e.ticket!.projectId)
    ).size;

    const uniqueDates = new Set(timesheets.map((e) => e.date)).size;
    const avgHoursPerDay = uniqueDates > 0 ? totalHours / uniqueDates : 0;

    return { totalHours, uniqueEmployees, uniqueProjects, avgHoursPerDay };
  }, [timesheets]);

  const employeeBreakdown = useMemo(() => {
    if (!timesheets) return [];

    const breakdown = new Map<string, { name: string; hours: number; entries: number }>();

    timesheets.forEach((entry) => {
      if (!entry.user) return;
      const key = entry.userId!;
      const existing = breakdown.get(key);
      const hours = parseFloat(entry.hours || "0");

      if (existing) {
        existing.hours += hours;
        existing.entries += 1;
      } else {
        breakdown.set(key, {
          name: `${entry.user.firstName || ""} ${entry.user.lastName || ""}`.trim(),
          hours,
          entries: 1,
        });
      }
    });

    return Array.from(breakdown.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);
  }, [timesheets]);

  const exportToCSV = () => {
    if (!timesheets || timesheets.length === 0) return;

    const headers = ["Employee", "Date", "Project", "Ticket", "Hours", "Description"];
    const rows = timesheets.map((entry) => [
      `${entry.user?.firstName || ""} ${entry.user?.lastName || ""}`,
      format(new Date(entry.date), "yyyy-MM-dd"),
      entry.ticket?.project?.name || "N/A",
      entry.ticketId ? `#${entry.ticketId}` : "N/A",
      entry.hours,
      entry.description || "",
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
  };

  const clearFilters = () => {
    setSelectedEmployee("all");
    setSelectedProject("all");
    setSelectedStatus("all");
    setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  const hasActiveFilters =
    selectedEmployee !== "all" ||
    selectedProject !== "all" ||
    selectedStatus !== "all" ||
    startDate !== format(subDays(new Date(), 7), "yyyy-MM-dd") ||
    endDate !== format(new Date(), "yyyy-MM-dd");

  const setQuickDateRange = (range: "today" | "week" | "month") => {
    const today = new Date();
    switch (range) {
      case "today":
        setStartDate(format(today, "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "week":
        setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        break;
      case "month":
        setStartDate(format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd"));
        setEndDate(format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd"));
        break;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Timesheets</h2>
          <p className="text-muted-foreground">Monitor team productivity and time allocation</p>
        </div>
        <Button onClick={exportToCSV} disabled={!timesheets || timesheets.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees?.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
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

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickDateRange("today")}>
            <Calendar className="mr-1 h-3 w-3" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateRange("week")}>
            <Calendar className="mr-1 h-3 w-3" />
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateRange("month")}>
            <Calendar className="mr-1 h-3 w-3" />
            This Month
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  Across {timesheets?.length || 0} entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.uniqueEmployees}</div>
                <p className="text-xs text-muted-foreground">Team members logged time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.uniqueProjects}</div>
                <p className="text-xs text-muted-foreground">Active projects worked on</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.avgHoursPerDay.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">Average per working day</p>
              </CardContent>
            </Card>
          </div>

          {employeeBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Employee Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employeeBreakdown.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{emp.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{emp.entries} entries</span>
                        <Badge variant="secondary">{emp.hours.toFixed(1)}h</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets && timesheets.length > 0 ? (
                    timesheets.map((entry) => {
                      return (
                        <TableRow 
                          key={entry.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleEntryClick(entry)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={entry.user?.image || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {entry.user?.firstName?.[0]}
                                  {entry.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {entry.user?.firstName} {entry.user?.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {entry.ticket?.project?.name ? (
                              <Badge variant="outline">{entry.ticket.project.name}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {entry.ticketId ? (
                              <span>#{entry.ticketId}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge>{entry.hours}h</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                            {entry.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === "APPROVED"
                                  ? "default"
                                  : entry.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {entry.status || "PENDING"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.status === "APPROVED" && (
                              <span className="text-xs text-muted-foreground">
                                by {entry.approverName || "Admin"}
                              </span>
                            )}
                            {entry.status === "REJECTED" && (
                              <span className="text-xs text-red-600">
                                {entry.rejectionReason || "Rejected"}
                              </span>
                            )}
                            {(!entry.status || entry.status === "PENDING") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEntryClick(entry);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                              >
                                Click to review
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {hasActiveFilters
                          ? "No time entries match your filters."
                          : "No time entries found."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <TimeEntryDetailSheet
        entry={selectedEntry}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}

