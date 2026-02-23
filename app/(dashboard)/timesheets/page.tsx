"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { Loader2, Filter, X, Edit, Trash2, Clock } from "lucide-react";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import { EditTimeEntryDialog } from "@/components/timesheets/edit-time-entry-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function TimesheetsPage() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [editingEntry, setEditingEntry] = useState<{
    id: number;
    description: string | null;
    hours: string;
    status: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const { data: projects } = api.project.getProjects.useQuery();
  const utils = api.useUtils();
  
  const getDateRange = () => {
    const now = new Date();
    let start: string | undefined;
    let end: string | undefined;

    switch (dateRange) {
      case "this-week":
        start = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        end = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
        break;
      case "last-week":
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        start = format(lastWeekStart, "yyyy-MM-dd");
        end = format(lastWeekEnd, "yyyy-MM-dd");
        break;
      case "this-month":
        start = format(startOfMonth(now), "yyyy-MM-dd");
        end = format(endOfMonth(now), "yyyy-MM-dd");
        break;
      case "last-month":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));
        start = format(lastMonthStart, "yyyy-MM-dd");
        end = format(lastMonthEnd, "yyyy-MM-dd");
        break;
      case "custom":
        start = startDate || undefined;
        end = endDate || undefined;
        break;
      default:
        start = undefined;
        end = undefined;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  const { data: entries, isLoading } = api.project.getTimeEntries.useQuery({
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: start,
    endDate: end,
  });

  const totalHours = useMemo(() => {
    if (!entries) return 0;
    return entries.reduce((sum, e) => sum + parseFloat(e.hours?.toString() || "0"), 0);
  }, [entries]);

  const hasActiveFilters = selectedProject !== "all" || dateRange !== "all";

  const clearFilters = () => {
    setSelectedProject("all");
    setDateRange("all");
    setStartDate("");
    setEndDate("");
  };

  const deleteMutation = api.project.deleteTimeEntry.useMutation({
    onSuccess: () => {
      toast.success("Time entry deleted successfully");
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      utils.project.getTimeEntries.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete time entry");
    },
  });

  const handleDelete = (entryId: number) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      deleteMutation.mutate({ entryId: entryToDelete });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timesheets</h2>
          <p className="text-muted-foreground mt-1">
            {entries ? (
              <>
                {entries.length} {entries.length === 1 ? "entry" : "entries"} — {totalHours.toFixed(1)}h logged
                {hasActiveFilters && " (filtered)"}
              </>
            ) : (
              "Track your time across projects"
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <LogTimeDialog variant="sheet" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Entries</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-filter" className="text-xs">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project-filter">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-range" className="text-xs">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="date-range">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {hasActiveFilters && entries && entries.length > 0 && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {entries.length} time {entries.length === 1 ? "entry" : "entries"}
                  {selectedProject !== "all" && ` for selected project`}
                  {dateRange !== "all" && ` in selected date range`}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.map((entry) => {
                    const canEdit = entry.status === "PENDING";
                    const ticket = entry.ticket;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket?.project?.name || "Unknown Project"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                           {ticket?.id ? `#${ticket.id} - ${ticket.title || 'Untitled'}` : '-'}
                        </TableCell>
                        <TableCell>{entry.hours}h</TableCell>
                        <TableCell className="text-muted-foreground">{entry.description}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditingEntry({
                                    id: entry.id,
                                    description: entry.description,
                                    hours: entry.hours?.toString() || "0",
                                    status: entry.status || "PENDING",
                                  })}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!entries?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <EmptyTimeIllustration />
                          <p>{hasActiveFilters
                            ? "No time entries found matching your filters."
                            : "No time entries found. Log your first work item!"}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
