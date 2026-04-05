"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Shield, ChevronLeft, ChevronRight, Activity, Info, ChevronsLeft, ChevronsRight } from "lucide-react";
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useAuditLogs,
  useAuditLogActions,
  useAuditLogTargetTypes,
  type AuditLogRow,
} from "@/lib/api/hooks/audit-log";
import { resolveImageUrl } from "@/lib/utils";

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const ACTION_COLORS: Record<string, string> = {
  "user.login": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "user.logout": "bg-slate-500/10 text-slate-600 border-slate-200",
  "user.password_reset": "bg-amber-500/10 text-amber-700 border-amber-200",
  "user.deactivated": "bg-red-500/10 text-red-600 border-red-200",
  "org.member_invited": "bg-blue-500/10 text-blue-600 border-blue-200",
  "org.member_removed": "bg-red-500/10 text-red-600 border-red-200",
  "org.member_role_changed": "bg-purple-500/10 text-purple-600 border-purple-200",
  "expense.approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "expense.rejected": "bg-red-500/10 text-red-600 border-red-200",
  "hr.leave_approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "hr.leave_rejected": "bg-red-500/10 text-red-600 border-red-200",
  "hr.payroll_generated": "bg-blue-500/10 text-blue-600 border-blue-200",
  "settings.updated": "bg-amber-500/10 text-amber-700 border-amber-200",
  "file.upload": "bg-sky-500/10 text-sky-600 border-sky-200",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function actionBadgeClass(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

interface LogTableRowProps {
  log: AuditLogRow;
  onSelect: (log: AuditLogRow) => void;
}

function LogTableRow({ log, onSelect }: LogTableRowProps) {
  const handleClick = useCallback(() => onSelect(log), [log, onSelect]);
  return (
    <TableRow className="cursor-pointer" onClick={handleClick}>
      <TableCell className="text-[12px] text-muted-foreground font-mono whitespace-nowrap">
        {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[140px]">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={resolveImageUrl(log.userImage)} />
            <AvatarFallback className="text-[9px]">{getInitials(log.userName)}</AvatarFallback>
          </Avatar>
          <span className="text-[13px] font-medium truncate max-w-[120px]">
            {log.userName ?? log.userEmail ?? log.userId}
          </span>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant="outline" className={`text-[11px] ${actionBadgeClass(log.action)}`}>
          {log.action}
        </Badge>
      </TableCell>
      <TableCell className="text-[12px] text-muted-foreground capitalize whitespace-nowrap">
        {log.targetType ?? "—"}
        {log.targetId && (
          <span className="text-[11px] opacity-60"> #{log.targetId}</span>
        )}
      </TableCell>
      <TableCell className="text-[12px] font-mono text-muted-foreground whitespace-nowrap">
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}

function LogDetailSheet({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col p-0 w-[380px] sm:max-w-[380px]">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Event Details
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-4">
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
                <div>
                  <p className="text-sm font-medium leading-tight">{log.userName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{log.userEmail}</p>
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
                <pre className="text-[11px] bg-muted/60 rounded-md p-3 overflow-auto max-h-52 border text-foreground">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </DetailField>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [goToPage, setGoToPage] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize,
    action: actionFilter !== "all" ? actionFilter : undefined,
    targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: actions } = useAuditLogActions();
  const { data: targetTypes } = useAuditLogTargetTypes();

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const resetFilters = useCallback(() => {
    setActionFilter("all");
    setTargetTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handleActionFilter = useCallback((v: string) => { setActionFilter(v); setPage(1); }, []);
  const handleTargetTypeFilter = useCallback((v: string) => { setTargetTypeFilter(v); setPage(1); }, []);
  const handleDateFrom = useCallback((v: string) => { setDateFrom(v); setPage(1); }, []);
  const handleDateTo = useCallback((v: string) => { setDateTo(v); setPage(1); }, []);
  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);
  const handleFirstPage = useCallback(() => setPage(1), []);
  const handleLastPage = useCallback(() => setPage(totalPages), [totalPages]);
  const handleCloseSheet = useCallback(() => setSelectedLog(null), []);

  const handlePageSizeChange = useCallback((v: string) => {
    setPageSize(Number(v) as PageSize);
    setPage(1);
  }, []);

  const handleGoToPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPage(e.target.value);
  }, []);

  const handleGoToPageKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(goToPage);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        setPage(num);
        setGoToPage("");
      }
    }
  }, [goToPage, totalPages]);

  const hasActiveFilters = actionFilter !== "all" || targetTypeFilter !== "all" || !!dateFrom || !!dateTo;

  const filtersBar = (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1 min-w-[160px] flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">Action</p>
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions?.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-[130px] flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">Entity Type</p>
        <Select value={targetTypeFilter} onValueChange={handleTargetTypeFilter}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {targetTypes?.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 min-w-[140px] flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">From</p>
        <DatePicker value={dateFrom} onChange={handleDateFrom} placeholder="From date" className="w-full" />
      </div>
      <div className="flex flex-col gap-1 min-w-[140px] flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">To</p>
        <DatePicker value={dateTo} onChange={handleDateTo} placeholder="To date" className="w-full" />
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-sm self-end">
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all system actions, logins, and changes across your organization."
      actions={
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            {total.toLocaleString()} events
          </span>
        </div>
      }
      filters={filtersBar}
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: pageSize }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
                <Shield className="h-9 w-9 opacity-20" />
                <p className="text-sm">No audit events found.</p>
              </div>
            ) : (
              <ScrollArea className="w-full max-h-[60vh]" type="auto">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[170px]">Timestamp</TableHead>
                        <TableHead className="w-[190px]">User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="w-[110px]">Entity</TableHead>
                        <TableHead className="w-[110px]">IP Address</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <LogTableRow key={log.id} log={log} onSelect={setSelectedLog} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-[12px]">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
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

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleFirstPage}
                disabled={page <= 1}
                aria-label="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevPage}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium tabular-nums px-1">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleLastPage}
                disabled={page >= totalPages}
                aria-label="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[12px]">Go to</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goToPage}
                  onChange={handleGoToPageChange}
                  onKeyDown={handleGoToPageKeyDown}
                  placeholder="—"
                  className="h-7 w-14 text-xs text-center"
                  aria-label="Go to page"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={handleCloseSheet} />}
    </PageWrapper>
  );
}
