"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Shield, Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import {
  useAuditLogs,
  useAuditLogActions,
  useAuditLogTargetTypes,
  type AuditLogRow,
} from "@/hooks/api/audit-log";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";

const ACTION_COLORS: Record<string, string> = {
  "user.login": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "user.logout": "bg-muted text-muted-foreground border-border",
  "user.password_reset": "bg-amber-500/10 text-amber-700 border-amber-200",
  "user.deactivated": "bg-red-500/10 text-red-600 border-red-200",
  "org.member_invited": "bg-blue-500/10 text-blue-600 border-blue-200",
  "org.member_removed": "bg-red-500/10 text-red-600 border-red-200",
  "org.member_role_changed": "bg-purple-500/10 text-purple-600 border-purple-200",
  "org.archived": "bg-red-500/10 text-red-600 border-red-200",
  "org.restored": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "org.ownership_transferred": "bg-purple-500/10 text-purple-600 border-purple-200",
  "org.businessUnit": "bg-blue-500/10 text-blue-600 border-blue-200",
  "org.branch": "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  "org.department": "bg-violet-500/10 text-violet-600 border-violet-200",
  "org.team": "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200",
  "org.holiday": "bg-orange-500/10 text-orange-600 border-orange-200",
  "org.domain": "bg-cyan-500/10 text-cyan-600 border-cyan-200",
  "org.setup": "bg-teal-500/10 text-teal-600 border-teal-200",
  "expense.approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "expense.rejected": "bg-red-500/10 text-red-600 border-red-200",
  "hr.leave_approved": "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  "hr.leave_rejected": "bg-red-500/10 text-red-600 border-red-200",
  "hr.payroll_generated": "bg-blue-500/10 text-blue-600 border-blue-200",
  "role.changed": "bg-purple-500/10 text-purple-600 border-purple-200",
  "settings.updated": "bg-amber-500/10 text-amber-700 border-amber-200",
  "file.upload": "bg-sky-500/10 text-sky-600 border-sky-200",
};

const ACTION_LABELS: Record<string, string> = {
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
  "role.changed": "Role Updated",
  "user.registered": "User Registered",
  "user.login": "Login",
  "user.logout": "Logout",
  "user.password_reset": "Password Reset",
  "user.deactivated": "User Deactivated",
  "org.member_invited": "Member Invited",
  "org.member_removed": "Member Removed",
  "org.member_role_changed": "Member Role Changed",
};

function formatActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" — ");
}

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function isValidPageSize(n: number): n is PageSize {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n);
}

function actionBadgeClass(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key)) return cls;
  }
  return "bg-muted text-muted-foreground border-border";
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
      <SheetContent className="flex flex-col p-0 sm:max-w-[420px]">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Event Details
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-4">
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
              <pre className="text-[11px] bg-muted/60 rounded-md p-3 border text-foreground overflow-y-auto overflow-x-hidden whitespace-pre-wrap wrap-break-word max-h-none h-[calc(100vh-360px)] min-h-[120px]">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </DetailField>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

const AUDIT_LOG_COLUMNS: DataTableColumn<AuditLogRow>[] = [
  {
    key: "createdAt",
    header: "Timestamp",
    cell: (log) => (
      <span className="text-[12px] text-muted-foreground font-mono whitespace-nowrap">
        {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
      </span>
    ),
    className: "w-[170px]",
  },
  {
    key: "user",
    header: "User",
    cell: (log) => (
      <div className="flex items-center gap-2 min-w-[140px]">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={resolveImageUrl(log.userImage)} />
          <AvatarFallback className="text-[9px]">{getInitials(log.userName)}</AvatarFallback>
        </Avatar>
        <span className="text-[13px] font-medium truncate max-w-[120px]">
          {log.userName ?? log.userEmail ?? log.userId}
        </span>
      </div>
    ),
    className: "w-[190px]",
  },
  {
    key: "action",
    header: "Action",
    cell: (log) => (
      <Badge variant="outline" className={`text-[11px] ${actionBadgeClass(log.action)}`}>
        {formatActionLabel(log.action)}
      </Badge>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    cell: (log) => (
      <span className="text-[12px] text-muted-foreground capitalize whitespace-nowrap">
        {log.targetType ?? "—"}
        {log.targetId && (
          <span className="text-[11px] opacity-60"> #{log.targetId}</span>
        )}
      </span>
    ),
    className: "w-[110px]",
  },
  {
    key: "ipAddress",
    header: "IP Address",
    cell: (log) => (
      <span className="text-[12px] font-mono text-muted-foreground whitespace-nowrap">
        {log.ipAddress ?? "—"}
      </span>
    ),
    className: "w-[110px]",
  },
  {
    key: "details",
    header: "",
    cell: () => (
      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="View details">
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    ),
    className: "w-[50px]",
  },
];

export default function AuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [goToPage, setGoToPage] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const page = Number(searchParams.get("page")) || 1;
  const pageSizeParam = Number(searchParams.get("size"));
  const pageSize: PageSize = isValidPageSize(pageSizeParam) ? pageSizeParam : 15;
  const actionFilter = searchParams.get("action") || "all";
  const targetTypeFilter = searchParams.get("target") || "all";
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

  const { data, isLoading, isError, refetch } = useAuditLogs({
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

  const filteredLogs = useMemo(
    () =>
      userSearch.trim()
        ? logs.filter(
            (log) =>
              (log.userName ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
              (log.userEmail ?? "").toLowerCase().includes(userSearch.toLowerCase()),
          )
        : logs,
    [logs, userSearch],
  );

  const resetFilters = useCallback(() => {
    updateParams({ action: null, target: null, from: null, to: null, page: null });
    setUserSearch("");
  }, [updateParams]);

  const handleActionFilter = useCallback((v: string) => updateParams({ action: v === "all" ? null : v, page: null }), [updateParams]);
  const handleTargetTypeFilter = useCallback((v: string) => updateParams({ target: v === "all" ? null : v, page: null }), [updateParams]);
  const handleDateFrom = useCallback((v: string) => updateParams({ from: v || null, page: null }), [updateParams]);
  const handleDateTo = useCallback((v: string) => updateParams({ to: v || null, page: null }), [updateParams]);
  const handleCloseSheet = useCallback(() => setSelectedLog(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleRowClick = useCallback((log: AuditLogRow) => setSelectedLog(log), []);

  const handlePageSizeChange = useCallback((v: string) => {
    updateParams({ size: v === "10" ? null : v, page: null });
  }, [updateParams]);

  const handleUserSearchChange = useCallback((value: string) => {
    setUserSearch(value);
  }, []);

  const handleGoToPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGoToPage(e.target.value);
  }, []);

  const handleGoToPageKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt(goToPage);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        updateParams({ page: num === 1 ? null : String(num) });
        setGoToPage("");
      }
    }
  }, [goToPage, totalPages, updateParams]);

  const handlePageChange = useCallback((p: number) => {
    updateParams({ page: p <= 1 ? null : String(p) });
  }, [updateParams]);

  const hasActiveFilters = actionFilter !== "all" || targetTypeFilter !== "all" || !!dateFrom || !!dateTo || !!userSearch;

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

  const goToPageToolbar = (
    <div className="hidden md:flex items-center gap-1.5">
      <span className="text-[12px] text-muted-foreground">Go to</span>
      <Input
        type="number"
        min={1}
        max={totalPages}
        value={goToPage}
        onChange={handleGoToPageChange}
        onKeyDown={handleGoToPageKeyDown}
        placeholder="—"
        className="h-8 w-14 text-xs text-center"
        aria-label="Go to page"
      />
    </div>
  );

  const pageSizeToolbar = (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-muted-foreground">Rows per page</span>
      <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
        <SelectTrigger className="h-8 w-[64px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((s) => (
            <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const toolbar = (
    <div className="flex items-center gap-3">
      {pageSizeToolbar}
      {goToPageToolbar}
    </div>
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Track all system actions, logins, and changes across your organization."
      noInternalScroll
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError ? (
          <ErrorState
            title="Failed to load audit events"
            description="Something went wrong while fetching audit events. Please try again."
            onRetry={handleRetry}
            compact
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={pageSize} columns={6} className="flex-1" />
        ) : (
          <DataTable
            data={filteredLogs}
            columns={AUDIT_LOG_COLUMNS}
            className="flex-1 min-h-0"
            getRowKey={(log) => log.id}
            onRowClick={handleRowClick}
            minWidth="700px"
            search={{ value: userSearch, onChange: handleUserSearchChange, placeholder: "Search by name or email" }}
            toolbar={toolbar}
            pagination={{
              mode: "server",
              page,
              pageSize,
              total,
              onPageChange: handlePageChange,
            }}
            emptyState={
              <div className="py-14 flex flex-col items-center gap-3 text-center">
                <EmptyDocumentsIllustration className="h-40 w-40 opacity-95" />
                <div className="space-y-1 text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">No audit events found</p>
                  {hasActiveFilters && (
                    <p className="text-xs">Try adjusting your filters to see results.</p>
                  )}
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>

      {selectedLog && <LogDetailSheet log={selectedLog} onClose={handleCloseSheet} />}
    </PageWrapper>
  );
}
