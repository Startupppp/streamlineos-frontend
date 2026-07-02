"use client";

import { useState, useCallback, useTransition, Suspense, type KeyboardEvent, type ChangeEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import {
  Shield, ChevronLeft, ChevronRight, Activity, Info, ChevronsLeft, ChevronsRight, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useAuditLogs, type AuditLogRow } from "@/hooks/api/audit-log";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

const ORG_ACTION_COLORS: Record<string, string> = {
  "org.businessUnit": "bg-blue-500/10 text-blue-600 border-blue-200",
  "org.branch": "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  "org.department": "bg-violet-500/10 text-violet-600 border-violet-200",
  "org.team": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200",
  "org.holiday": "bg-orange-500/10 text-orange-600 border-orange-200",
  "org.domain": "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  "org.member_invited": "bg-blue-500/10 text-blue-600 border-blue-200",
  "org.member_removed": "bg-red-500/10 text-red-600 border-red-200",
  "org.member_role_changed": "bg-purple-500/10 text-purple-600 border-purple-200",
  "org.archived": "bg-red-500/10 text-red-600 border-red-200",
  "org.restored": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "org.ownership_transferred": "bg-purple-500/10 text-purple-600 border-purple-200",
  "org.settings": "bg-amber-500/10 text-amber-700 border-amber-200",
  "org.setup": "bg-teal-500/10 text-teal-600 border-teal-200",
  "org.switched": "bg-slate-500/10 text-slate-600 border-slate-200",
};

const ORG_ACTION_LABELS: Record<string, string> = {
  "org.archived": "Org Archived",
  "org.restored": "Org Restored",
  "org.ownership_transferred": "Ownership Transferred",
  "org.setup.completed": "Setup Completed",
  "org.businessUnit.created": "Business Unit Created",
  "org.businessUnit.updated": "Business Unit Updated",
  "org.businessUnit.deleted": "Business Unit Deleted",
  "org.branch.created": "Branch Created",
  "org.branch.updated": "Branch Updated",
  "org.branch.deleted": "Branch Deleted",
  "org.department.created": "Department Created",
  "org.department.updated": "Department Updated",
  "org.department.deleted": "Department Deleted",
  "org.team.created": "Team Created",
  "org.team.updated": "Team Updated",
  "org.team.deleted": "Team Deleted",
  "org.holiday.created": "Holiday Added",
  "org.holiday.deleted": "Holiday Removed",
  "org.domain.added": "Custom Domain Added",
  "org.domain.verified": "Custom Domain Verified",
  "org.domain.removed": "Custom Domain Removed",
  "org.member_invited": "Member Invited",
  "org.member_removed": "Member Removed",
  "org.member_role_changed": "Role Changed",
  "org.switched": "Org Switched",
  "org.settings.updated": "Settings Updated",
};

function formatActionLabel(action: string): string {
  if (ORG_ACTION_LABELS[action]) return ORG_ACTION_LABELS[action];
  return action
    .replace(/^org\./, "")
    .split(".")
    .map((p) => p.replace(/_/g, " "))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" — ");
}

function actionBadgeClass(action: string) {
  for (const [key, cls] of Object.entries(ORG_ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

const ORG_ACTION_TYPES = [
  { value: "org.businessUnit", label: "Business Units" },
  { value: "org.branch", label: "Branches" },
  { value: "org.department", label: "Departments" },
  { value: "org.team", label: "Teams" },
  { value: "org.holiday", label: "Holidays" },
  { value: "org.domain", label: "Custom Domains" },
  { value: "org.member_invited", label: "Member Invited" },
  { value: "org.member_removed", label: "Member Removed" },
  { value: "org.member_role_changed", label: "Role Changed" },
  { value: "org.archived", label: "Org Archived" },
  { value: "org.restored", label: "Org Restored" },
  { value: "org.ownership_transferred", label: "Ownership Transferred" },
  { value: "org.settings.updated", label: "Settings Updated" },
];

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function isValidPageSize(n: number): n is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n);
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

function LogDetailSheet({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col p-0 w-full sm:max-w-lg">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Event Details
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          <DetailField label="Action">
            <Badge variant="outline" className={`text-xs ${actionBadgeClass(log.action)}`}>
              {log.action}
            </Badge>
          </DetailField>
          <DetailField label="User">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-7 w-7">
                <AvatarImage src={resolveImageUrl(log.userImage)} />
                <AvatarFallback className="text-[10px]">{getInitials(log.userName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{log.userName ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
              </div>
            </div>
          </DetailField>
          {log.targetType && (
            <DetailField label="Target">
              <p className="text-sm">
                <span className="font-medium capitalize">{log.targetType}</span>
                {log.targetId && <span className="text-muted-foreground"> #{log.targetId}</span>}
              </p>
            </DetailField>
          )}
          <DetailField label="Timestamp">
            <p className="text-sm">{format(new Date(log.createdAt), "PPpp")}</p>
          </DetailField>
          {log.ipAddress && (
            <DetailField label="IP Address">
              <p className="text-sm font-mono">{log.ipAddress}</p>
            </DetailField>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <DetailField label="Metadata">
              <pre className="text-[11px] bg-muted/60 rounded-md p-3 border text-foreground overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </DetailField>
          )}
        </div>
        <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end">
          <SheetClose asChild>
            <Button variant="outline" size="sm">Close</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface LogRowProps {
  log: AuditLogRow;
  onSelect: (log: AuditLogRow) => void;
}

function LogRow({ log, onSelect }: LogRowProps) {
  const handleClick = useCallback(() => onSelect(log), [log, onSelect]);

  return (
    <TableRow className="h-8 cursor-pointer hover:bg-muted/40" onClick={handleClick}>
      <TableCell className="text-[11px] text-muted-foreground font-mono whitespace-nowrap px-2 py-1">
        {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={resolveImageUrl(log.userImage)} />
            <AvatarFallback className="text-[9px]">{getInitials(log.userName)}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] font-medium truncate max-w-[120px]">
            {log.userName ?? log.userEmail ?? log.userId}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className={`text-[10px] ${actionBadgeClass(log.action)}`}>
          {formatActionLabel(log.action)}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] text-muted-foreground capitalize whitespace-nowrap px-2 py-1">
        {log.targetType ?? "—"}
        {log.targetId && <span className="text-[10px] opacity-60"> #{log.targetId}</span>}
      </TableCell>
      <TableCell className="text-[11px] font-mono text-muted-foreground whitespace-nowrap px-2 py-1">
        {log.ipAddress ?? "—"}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="View details">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function OrgAuditLogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [goToPage, setGoToPage] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [search, setSearch] = useState("");

  const page = Number(searchParams.get("page")) || 1;
  const pageSizeParam = Number(searchParams.get("size"));
  const pageSize: PageSize = isValidPageSize(pageSizeParam) ? pageSizeParam : 15;
  const actionFilter = searchParams.get("action") || "all";
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const effectiveAction = actionFilter !== "all" ? actionFilter : "org.";

  const { data, isLoading, isError, refetch } = useAuditLogs({
    page,
    pageSize,
    action: effectiveAction,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const filteredLogs = search
    ? logs.filter((l) => {
        const q = search.toLowerCase();
        return (
          (l.userName ?? "").toLowerCase().includes(q) ||
          (l.userEmail ?? "").toLowerCase().includes(q) ||
          formatActionLabel(l.action).toLowerCase().includes(q)
        );
      })
    : logs;

  const hasActiveFilters = actionFilter !== "all" || !!dateFrom || !!dateTo;

  const resetFilters = useCallback(
    () => updateParams({ action: null, from: null, to: null, page: null }),
    [updateParams],
  );
  const handleSelectLog = useCallback((log: AuditLogRow) => setSelectedLog(log), []);
  const handleCloseLog = useCallback(() => setSelectedLog(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleActionChange = useCallback(
    (v: string) => updateParams({ action: v === "all" ? null : v, page: null }),
    [updateParams],
  );
  const handleFromChange = useCallback(
    (v: string) => updateParams({ from: v || null, page: null }),
    [updateParams],
  );
  const handleToChange = useCallback(
    (v: string) => updateParams({ to: v || null, page: null }),
    [updateParams],
  );
  const handleSizeChange = useCallback(
    (v: string) => updateParams({ size: v, page: null }),
    [updateParams],
  );
  const handleFirstPage = useCallback(
    () => updateParams({ page: null }),
    [updateParams],
  );
  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [updateParams, page],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(Math.min(totalPages, page + 1)) }),
    [updateParams, totalPages, page],
  );
  const handleLastPage = useCallback(
    () => updateParams({ page: String(totalPages) }),
    [updateParams, totalPages],
  );
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [],
  );
  const handleGoToChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setGoToPage(e.target.value),
    [],
  );
  const handleGoToKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const num = parseInt(goToPage);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          updateParams({ page: num === 1 ? null : String(num) });
          setGoToPage("");
        }
      }
    },
    [goToPage, totalPages, updateParams],
  );

  return (
    <PageWrapper
      title="Organization Audit Log"
      subtitle="Track changes to organization settings and membership."
      noInternalScroll
      actions={
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            {total.toLocaleString()} events
          </span>
        </div>
      }
      filters={
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actor or action…"
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs max-w-[220px]"
            />
          </div>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger className="h-8 text-xs min-w-[180px]">
              <SelectValue placeholder="All org actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Org Actions</SelectItem>
              {ORG_ACTION_TYPES.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker value={dateFrom} onChange={handleFromChange} placeholder="From date" className="h-8 min-w-[140px]" />
          <DatePicker value={dateTo} onChange={handleToChange} placeholder="To date" className="h-8 min-w-[140px]" />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-sm">Clear</Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-0">
        <Card className="flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full min-h-0">
            {isLoading ? (
              <div className="p-3 space-y-1">
                {Array.from({ length: Math.min(pageSize, 15) }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            ) : isError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-sm text-muted-foreground">Failed to load audit events.</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <EmptyDocumentsIllustration className="h-24 w-24 opacity-90" />
                <div className="space-y-1 text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">No audit events found</p>
                  {search && logs.length > 0
                    ? <p className="text-xs">No events on this page match &quot;{search}&quot;.</p>
                    : hasActiveFilters && <p className="text-xs">Try adjusting your filters to see results.</p>
                  }
                </div>
                {hasActiveFilters && !search && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="min-w-[700px] border-b border-border/60 bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[170px] bg-card text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Timestamp</TableHead>
                        <TableHead className="w-[190px] bg-card text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">User</TableHead>
                        <TableHead className="bg-card text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Action</TableHead>
                        <TableHead className="w-[110px] bg-card text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Entity</TableHead>
                        <TableHead className="w-[110px] bg-card text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">IP</TableHead>
                        <TableHead className="w-[50px] bg-card px-2 py-1.5" />
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>
                <ScrollArea className="w-full flex-1 min-h-0" type="auto">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <LogRow key={log.id} log={log} onSelect={handleSelectLog} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            )}

            {total > 0 && (
              <div className="shrink-0 border-t border-border/60 bg-card">
                <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px]">Rows per page</span>
                    <Select value={String(pageSize)} onValueChange={handleSizeChange}>
                      <SelectTrigger className="h-7 w-[64px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[12px] tabular-nums">
                      {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button variant="outline" size="icon" className="h-7 w-7 hidden sm:inline-flex"
                      onClick={handleFirstPage} disabled={page <= 1} aria-label="First page">
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={handlePrevPage} disabled={page <= 1} aria-label="Previous page">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums px-1">{page} / {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7"
                      onClick={handleNextPage} disabled={page >= totalPages} aria-label="Next page">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 hidden sm:inline-flex"
                      onClick={handleLastPage} disabled={page >= totalPages} aria-label="Last page">
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                    <div className="hidden md:flex items-center gap-1.5 ml-1">
                      <span className="text-[12px]">Go to</span>
                      <Input
                        type="number" min={1} max={totalPages}
                        value={goToPage}
                        onChange={handleGoToChange}
                        onKeyDown={handleGoToKeyDown}
                        placeholder="—"
                        className="h-7 w-14 text-xs text-center"
                        aria-label="Go to page"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={handleCloseLog} />}
    </PageWrapper>
  );
}

export default function OrgAuditLogPage() {
  return (
    <Suspense>
      <OrgAuditLogContent />
    </Suspense>
  );
}
