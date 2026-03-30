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
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyTimeIllustration } from "@/components/illustrations";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import { EditTimeEntryDialog } from "@/components/timesheets/edit-time-entry-dialog";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { formatHoursMinutes } from "@/lib/format-utils";
import { toast } from "sonner";
import {
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

const statusBadgeStyles: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const statusLabels: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

const PROJECT_DOT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
] as const;

function getProjectDotColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_DOT_COLORS[Math.abs(hash) % PROJECT_DOT_COLORS.length];
}

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

  const { data: entries, isLoading } = api.project.getTimeEntries.useQuery({
    projectId: selectedProject === "all" ? undefined : parseInt(selectedProject),
    startDate: computedRange.start,
    endDate: computedRange.end,
  });

  const totalHours = useMemo(() => {
    if (!entries) return 0;
    return entries.reduce((sum, e) => sum + parseFloat(e.hours?.toString() || "0"), 0);
  }, [entries]);

  const paginatedEntries = useMemo(() => {
    if (!entries) return [];
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    return entries.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [entries, page]);

  const totalPages = entries ? Math.ceil(entries.length / ITEMS_PER_PAGE) : 0;

  const clearFilters = useCallback(() => {
    setSelectedProject("all");
    setDateRange("this-quarter");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setViewMode("current");
  }, []);

  const deleteMutation = api.project.deleteTimeEntry.useMutation({
    onSuccess: () => {
      toast.success("Time entry deleted");
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      utils.project.getTimeEntries.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
    if (mode === "current") {
      setDateRange("this-quarter");
    } else {
      setDateRange("all");
    }
  }, []);

  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  // Compute visible page numbers for pagination
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [page - 2, page - 1, page, page + 1, page + 2];
  }, [page, totalPages]);

  // CEO should not access personal timesheets — redirect to team view
  if (isCEO) {
    router.replace("/timesheets/team");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4 md:-mx-8 md:px-8 space-y-6 border-b border-border/40">
      <PageHeader
        title="Daily Work Logs"
        description="Track and manage professional activity across projects."
        actions={
          <LogTimeDialog
            trigger={
              <Button className="bg-[#bd882c] hover:bg-[#a67724] text-white font-bold shadow-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add New Log
              </Button>
            }
          />
        }
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
        {/* Inline filter chips */}
        <motion.div variants={fadeUp}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Project filter chip */}
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Project:</span>
              <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setPage(1); }}>
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

            {/* Period filter chip */}
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Period:</span>
              <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(1); setViewMode(v === "all" ? "history" : "current"); }}>
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

            {/* Custom date inputs */}
            {dateRange === "custom" && (
              <>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From:</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    aria-label="From date"
                    className="h-auto border-0 bg-transparent p-0 shadow-none text-sm font-medium w-[130px] focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To:</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    aria-label="To date"
                    className="h-auto border-0 bg-transparent p-0 shadow-none text-sm font-medium w-[130px] focus-visible:ring-0"
                  />
                </div>
              </>
            )}

            {/* Divider */}
            <div className="h-7 w-px bg-border mx-1 hidden sm:block" />

            {/* View mode tabs */}
            <button
              onClick={() => handleViewMode("current")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                viewMode === "current"
                  ? "bg-[#bd882c]/10 text-[#bd882c]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Current Quarter
            </button>
            <button
              onClick={() => handleViewMode("history")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "history"
                  ? "bg-[#bd882c]/10 text-[#bd882c]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </button>
          </div>
        </motion.div>
      </motion.div>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Summary bar */}
        {entries && entries.length > 0 && (
          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{entries.length}</span>{" "}
              {entries.length === 1 ? "entry" : "entries"} —{" "}
              <span className="font-semibold text-foreground">{totalHours.toFixed(1)}h</span> logged
            </p>
          </motion.div>
        )}

        {/* Table */}
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
                  <div className="overflow-x-auto" role="region" aria-label="Timesheets table" tabIndex={0}>
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
                          paginatedEntries.map((entry) => {
                            const canEdit = entry.status === "PENDING";
                            const ticket = entry.ticket;
                            const projectName = ticket?.project?.name || "Unknown";
                            const dotColor = getProjectDotColor(projectName);
                            const statusKey = entry.status || "PENDING";
                            return (
                              <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="px-6 py-5 whitespace-nowrap">
                                  <span className="text-sm font-semibold">
                                    {format(new Date(entry.date), "MMM dd, yyyy")}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <div className={`size-2 rounded-full shrink-0 ${dotColor}`} />
                                    <span className="text-sm font-medium">{projectName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-5 max-w-xs">
                                  <p className="text-sm text-muted-foreground truncate">
                                    {entry.description || "No description"}
                                  </p>
                                </TableCell>
                                <TableCell className="px-6 py-5 whitespace-nowrap">
                                  <span className="text-sm font-medium">
                                    {formatHoursMinutes(entry.hours)}
                                  </span>
                                </TableCell>
                                <TableCell className="px-6 py-5 whitespace-nowrap">
                                  <Badge className={`text-xs font-bold border-0 rounded-full px-2.5 py-0.5 ${statusBadgeStyles[statusKey]}`}>
                                    {statusLabels[statusKey] || statusKey}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-6 py-5 text-right">
                                  {canEdit ? (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setEditingEntry({
                                              id: entry.id,
                                              description: entry.description,
                                              hours: entry.hours?.toString() || "0",
                                              status: entry.status || "PENDING",
                                            })
                                          }
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setEntryToDelete(entry.id);
                                            setDeleteDialogOpen(true);
                                          }}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  ) : (
                                    <span className="text-muted-foreground/30 inline-flex h-8 w-8 items-center justify-center">
                                      <MoreVertical className="h-4 w-4" />
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
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

                  {/* Pagination */}
                  {entries && entries.length > 0 && (
                    <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, entries.length)}-{Math.min(page * ITEMS_PER_PAGE, entries.length)} of {entries.length} entries
                      </span>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {pageNumbers.map((num) => (
                            <Button
                              key={num}
                              variant={num === page ? "default" : "outline"}
                              size="icon"
                              className={`h-8 w-8 text-sm font-bold ${
                                num === page
                                  ? "bg-[#bd882c] hover:bg-[#a67724] text-white border-[#bd882c]"
                                  : ""
                              }`}
                              onClick={() => setPage(num)}
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
                            onClick={() => setPage((p) => p + 1)}
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
              onClick={() => entryToDelete && deleteMutation.mutate({ entryId: entryToDelete })}
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
