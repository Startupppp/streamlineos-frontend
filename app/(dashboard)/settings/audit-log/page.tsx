"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Shield, ChevronLeft, ChevronRight,
  Activity, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/* ─── Helpers ─── */

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

function actionBadgeClass(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
}

/* ─── Detail Sheet ─── */

function LogDetailSheet({ log, onClose }: { log: AuditLogRow; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col p-0 w-[440px] sm:max-w-[440px]">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-[15px]">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Event Details
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Action</p>
              <Badge variant="outline" className={`text-[12px] ${actionBadgeClass(log.action)}`}>
                {log.action}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">User</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={resolveImageUrl(log.userImage)} />
                  <AvatarFallback className="text-[10px]">{getInitials(log.userName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{log.userName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                </div>
              </div>
            </div>
            {log.targetType && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Target</p>
                <p className="text-sm">
                  <span className="font-medium capitalize">{log.targetType}</span>
                  {log.targetId && <span className="text-muted-foreground"> #{log.targetId}</span>}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Timestamp</p>
              <p className="text-sm">{format(new Date(log.createdAt), "PPpp")}</p>
            </div>
            {log.ipAddress && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">IP Address</p>
                <p className="text-sm font-mono">{log.ipAddress}</p>
              </div>
            )}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Metadata</p>
                <pre className="text-[11px] bg-muted/50 rounded-lg p-3 overflow-auto max-h-60 border">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Page ─── */

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize: 25,
    action: actionFilter !== "all" ? actionFilter : undefined,
    targetType: targetTypeFilter !== "all" ? targetTypeFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: actions } = useAuditLogActions();
  const { data: targetTypes } = useAuditLogTargetTypes();

  const resetFilters = useCallback(() => {
    setActionFilter("all");
    setTargetTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handleFilterChange = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  }, []);

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const filtersBar = (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Action</p>
        <Select value={actionFilter} onValueChange={handleFilterChange(setActionFilter)}>
          <SelectTrigger className="h-8 w-[200px] text-sm">
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
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Entity Type</p>
        <Select value={targetTypeFilter} onValueChange={handleFilterChange(setTargetTypeFilter)}>
          <SelectTrigger className="h-8 w-[160px] text-sm">
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
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">From</p>
        <Input
          type="date"
          className="h-8 text-sm w-[140px]"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">To</p>
        <Input
          type="date"
          className="h-8 text-sm w-[140px]"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        />
      </div>
      {(actionFilter !== "all" || targetTypeFilter !== "all" || dateFrom || dateTo) && (
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
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            {total.toLocaleString()} events
          </span>
        </div>
      }
      filters={filtersBar}
    >
      <div className="space-y-6">
      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-muted-foreground">
              <Shield className="h-10 w-10 opacity-20" />
              <p className="text-sm">No audit events found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[120px]">Entity</TableHead>
                  <TableHead className="w-[120px]">IP Address</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="text-[12px] text-muted-foreground font-mono">
                      {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={resolveImageUrl(log.userImage)} />
                          <AvatarFallback className="text-[9px]">{getInitials(log.userName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[13px] font-medium truncate max-w-[130px]">
                          {log.userName ?? log.userEmail ?? log.userId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] ${actionBadgeClass(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground capitalize">
                      {log.targetType ?? "—"}
                      {log.targetId && (
                        <span className="text-[11px] opacity-60"> #{log.targetId}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[12px] font-mono text-muted-foreground">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="View details">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={() => setSelectedLog(null)} />}
      </div>
    </PageWrapper>
  );
}
