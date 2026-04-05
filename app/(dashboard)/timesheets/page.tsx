"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subWeeks,
  subMonths,
  subQuarters,
} from "date-fns";
import {
  useProjects,
  useTimeEntries,
  useDeleteTimeEntry,
} from "@/lib/api/hooks/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyTimeIllustration } from "@/components/illustrations";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import { EditTimeEntryDialog } from "@/components/timesheets/edit-time-entry-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { TimesheetTableRow, type EditEntry } from "./_components/timesheet-table-row";

const ITEMS_PER_PAGE = 10;

type ViewMode = "current" | "history";

export default function TimesheetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isCEO = session?.user?.role === "CEO";

  const [selectedProject, setSelectedProject] = useState("all");
  const [dateRange, setDateRange] = useState("this-quarter");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("current");
  const [editingEntry, setEditingEntry] = useState<EditEntry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  const computedRange = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "this-quarter":
        return {
          start: format(startOfQuarter(now), "yyyy-MM-dd"),
          end: format(endOfQuarter(now), "yyyy-MM-dd"),
        };
      case "last-quarter": {
        const s = startOfQuarter(subQuarters(now, 1));
        const e = endOfQuarter(subQuarters(now, 1));
        return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
      }
      case "this-week":
        return {
          start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "last-week": {
        const s = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const e = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
      }
      case "this-month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
        };
      case "last-month": {
        const s = startOfMonth(subMonths(now, 1));
        const e = endOfMonth(subMonths(now, 1));
        return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
      }
      case "custom":
        return { start: startDate || undefined, end: endDate || undefined };
      default:
        return { start: undefined, end: undefined };
    }
  }, [dateRange, startDate, endDate]);

  const { data: entries, isLoading } = useTimeEntries({
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: computedRange.start,
    endDate: computedRange.end,
  });

  const totalHours = useMemo(
    () => (entries ?? []).reduce((sum, e) => sum + parseFloat(e.hours?.toString() || "0"), 0),
    [entries],
  );

  const paginatedEntries = useMemo(() => {
    if (!entries) return [];
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    return entries.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [entries, page]);

  const totalPages = entries ? Math.ceil(entries.length / ITEMS_PER_PAGE) : 0;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }, [page, totalPages]);

  const deleteMutation = useDeleteTimeEntry();

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
    setDateRange(mode === "current" ? "this-quarter" : "all");
  }, []);

  const handleViewModeCurrent = useCallback(() => handleViewMode("current"), [handleViewMode]);
  const handleViewModeHistory = useCallback(() => handleViewMode("history"), [handleViewMode]);

  const handleProjectChange = useCallback((v: string) => { setSelectedProject(v); setPage(1); }, []);
  const handlePeriodChange = useCallback((v: string) => {
    setDateRange(v);
    setPage(1);
    setViewMode(v === "all" ? "history" : "current");
  }, []);
  const handleStartDateChange = useCallback((v: string) => { setStartDate(v); setPage(1); }, []);
  const handleEndDateChange = useCallback((v: string) => { setEndDate(v); setPage(1); }, []);

  const handleEditEntry = useCallback((entry: EditEntry) => setEditingEntry(entry), []);
  const handleDeleteEntry = useCallback((id: number) => { setEntryToDelete(id); setDeleteDialogOpen(true); }, []);
  const handleEditDialogClose = useCallback((open: boolean) => { if (!open) setEditingEntry(null); }, []);

  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => p + 1), []);
  const handlePageNumber = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const num = parseInt(e.currentTarget.dataset.page ?? "1");
    if (!isNaN(num)) setPage(num);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!entryToDelete) return;
    deleteMutation.mutate(
      { entryId: entryToDelete },
      {
        onSuccess: () => {
          toast.success("Time entry deleted");
          setDeleteDialogOpen(false);
          setEntryToDelete(null);
        },
        onError: (err) => toast.error((err as Error).message || "Failed to delete"),
      },
    );
  }, [entryToDelete, deleteMutation]);

  const clearFilters = useCallback(() => {
    setSelectedProject("all");
    setDateRange("this-quarter");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setViewMode("current");
  }, []);

  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  if (isCEO) {
    router.replace("/timesheets/team");
    return null;
  }

  const filtersBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project:</span>
        <Select value={selectedProject} onValueChange={handleProjectChange}>
          <SelectTrigger aria-label="Filter by project" className="h-auto border-0 bg-transparent p-0 shadow-none text-sm font-medium min-w-[100px] focus:ring-0">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Period:</span>
        <Select value={dateRange} onValueChange={handlePeriodChange}>
          <SelectTrigger aria-label="Filter by time period" className="h-auto border-0 bg-transparent p-0 shadow-none text-sm font-medium min-w-[100px] focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-quarter">{currentQuarter} {currentYear}</SelectItem>
            <SelectItem value="last-quarter">Last Quarter</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="last-week">Last Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dateRange === "custom" && (
        <>
          <DatePicker value={startDate} onChange={handleStartDateChange} placeholder="From date" />
          <DatePicker value={endDate} onChange={handleEndDateChange} placeholder="To date" />
        </>
      )}

      <div className="h-7 w-px bg-border mx-1 hidden sm:block" />

      <button
        onClick={handleViewModeCurrent}
        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
          viewMode === "current" ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Current Quarter
      </button>
      <button
        onClick={handleViewModeHistory}
        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          viewMode === "history" ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        History
      </button>
    </div>
  );

  return (
    <PageWrapper
      title="Daily Work Logs"
      subtitle="Track and manage professional activity across projects."
      actions={
        <LogTimeDialog
          trigger={
            <Button className="bg-gold hover:bg-gold/90 text-white font-bold shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add New Log
            </Button>
          }
        />
      }
      filters={filtersBar}
    >
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {entries && entries.length > 0 && (
          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{entries.length}</span>{" "}
              {entries.length === 1 ? "entry" : "entries"} —{" "}
              <span className="font-semibold text-foreground">{totalHours.toFixed(1)}h</span> logged
            </p>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <ScrollArea className="w-full" type="auto" role="region" aria-label="Timesheets table">
                    <div className="min-w-max">
                    <Table>
                      <caption className="sr-only">Your daily work logs</caption>
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-muted/30">
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Date</TableHead>
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Project</TableHead>
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Task Description</TableHead>
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Duration</TableHead>
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</TableHead>
                          <TableHead scope="col" className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-6 py-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEntries.length > 0 ? (
                          paginatedEntries.map((entry) => (
                            <TimesheetTableRow
                              key={entry.id}
                              entry={entry}
                              onEdit={handleEditEntry}
                              onDelete={handleDeleteEntry}
                            />
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center gap-3">
                                <EmptyTimeIllustration />
                                <p>
                                  {selectedProject !== "all" || dateRange !== "this-quarter"
                                    ? "No work logs found matching your filters."
                                    : "No work logs found. Add your first log!"}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    </div>
                  </ScrollArea>

                  {entries && entries.length > 0 && (
                    <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, entries.length)}–{Math.min(page * ITEMS_PER_PAGE, entries.length)} of {entries.length} entries
                      </span>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={page <= 1}
                            onClick={handlePrevPage}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {pageNumbers.map((num) => (
                            <Button
                              key={num}
                              data-page={num}
                              variant={num === page ? "default" : "outline"}
                              size="icon"
                              className={`h-8 w-8 text-sm font-bold ${
                                num === page ? "bg-gold hover:bg-gold/90 text-white border-gold" : ""
                              }`}
                              onClick={handlePageNumber}
                              {...(num === page ? { "aria-current": "page" as const } : {})}
                            >
                              {num}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={page >= totalPages}
                            onClick={handleNextPage}
                            aria-label="Next page"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {editingEntry && (
        <EditTimeEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={handleEditDialogClose}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
