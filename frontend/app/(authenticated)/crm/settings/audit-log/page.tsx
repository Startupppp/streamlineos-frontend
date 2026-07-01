"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Shield, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";

type AuditAction =
  | "created" | "updated" | "deleted" | "archived" | "restored"
  | "assigned" | "unassigned" | "status_changed" | "stage_changed"
  | "converted" | "merged" | "exported" | "imported";

type AuditEntityType = "lead" | "contact" | "company" | "deal" | "task" | "quote" | "user" | "settings";

interface AuditLogEntry {
  id: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number | null;
  entityName: string | null;
  actorId: string;
  actorName: string;
  actorEmail: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

interface AuditFilters {
  entityType?: AuditEntityType;
  action?: AuditAction;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ["crm-audit-logs", filters] as const,
    queryFn: () =>
      apiClient.get<AuditLogsResponse>("/crm/audit-logs", filters as Record<string, unknown>),
    staleTime: 30_000,
  });
}

const ACTION_BADGE_COLORS: Record<AuditAction, string> = {
  created: "bg-emerald-100 text-emerald-700 border-0",
  updated: "bg-blue-100 text-blue-700 border-0",
  deleted: "bg-red-100 text-red-700 border-0",
  archived: "bg-slate-100 text-slate-600 border-0",
  restored: "bg-emerald-100 text-emerald-600 border-0",
  assigned: "bg-violet-100 text-violet-700 border-0",
  unassigned: "bg-violet-100 text-violet-600 border-0",
  status_changed: "bg-amber-100 text-amber-700 border-0",
  stage_changed: "bg-amber-100 text-amber-700 border-0",
  converted: "bg-purple-100 text-purple-700 border-0",
  merged: "bg-purple-100 text-purple-700 border-0",
  exported: "bg-blue-100 text-blue-600 border-0",
  imported: "bg-blue-100 text-blue-600 border-0",
};

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  lead: "Lead",
  contact: "Contact",
  company: "Company",
  deal: "Deal",
  task: "Task",
  quote: "Quote",
  user: "User",
  settings: "Settings",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  archived: "archived",
  restored: "restored",
  assigned: "assigned",
  unassigned: "unassigned",
  status_changed: "changed status of",
  stage_changed: "changed stage of",
  converted: "converted",
  merged: "merged",
  exported: "exported",
  imported: "imported",
};

function buildDescription(entry: AuditLogEntry): string {
  const entityLabel = ENTITY_TYPE_LABELS[entry.entityType];
  const actionLabel = ACTION_LABELS[entry.action];
  const entityName = entry.entityName ? `: ${entry.entityName}` : "";

  if (entry.action === "status_changed" && entry.changes?.status) {
    const { from, to } = entry.changes.status;
    return `${actionLabel} ${entityLabel}${entityName} — ${String(from ?? "—")} → ${String(to ?? "—")}`;
  }
  if (entry.action === "stage_changed" && entry.changes?.stage) {
    const { from, to } = entry.changes.stage;
    return `${actionLabel} ${entityLabel}${entityName} — ${String(from ?? "—")} → ${String(to ?? "—")}`;
  }
  return `${actionLabel} ${entityLabel}${entityName}`;
}

interface ChangesDisplayProps {
  changes: Record<string, { from: unknown; to: unknown }>;
}

function ChangesDisplay({ changes }: ChangesDisplayProps) {
  const entries = Object.entries(changes).slice(0, 3);
  const overflow = Object.keys(changes).length - 3;
  return (
    <div className="mt-1 space-y-0.5">
      {entries.map(([field, { from, to }]) => (
        <p key={field} className="text-xs text-muted-foreground">
          <span className="font-medium">{field}</span>:{" "}
          <span className="text-red-500 line-through">{String(from ?? "—")}</span>
          {" → "}
          <span className="text-emerald-600">{String(to ?? "—")}</span>
        </p>
      ))}
      {overflow > 0 && (
        <p className="text-xs text-muted-foreground">+{overflow} more changes</p>
      )}
    </div>
  );
}

interface AuditEntryRowProps {
  entry: AuditLogEntry;
  isLast: boolean;
}

function AuditEntryRow({ entry, isLast }: AuditEntryRowProps) {
  const initials = entry.actorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true });
    } catch {
      return entry.createdAt;
    }
  }, [entry.createdAt]);

  const absoluteTime = useMemo(() => {
    try {
      return format(new Date(entry.createdAt), "MMM d, yyyy h:mm a");
    } catch {
      return entry.createdAt;
    }
  }, [entry.createdAt]);

  return (
    <motion.div variants={fadeUp} className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initials}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{entry.actorName}</span>
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-medium",
                    ACTION_BADGE_COLORS[entry.action],
                  )}
                >
                  {entry.action.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {ENTITY_TYPE_LABELS[entry.entityType]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{buildDescription(entry)}</p>
              {entry.changes && Object.keys(entry.changes).length > 0 && (
                <ChangesDisplay changes={entry.changes} />
              )}
              {entry.ipAddress && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">IP: {entry.ipAddress}</p>
              )}
            </div>
            <span
              className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0"
              title={absoluteTime}
            >
              {relativeTime}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="w-px flex-1 bg-border/30 mt-1" />
          </div>
          <div className="flex-1 pb-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CrmAuditLogPage() {
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo<AuditFilters>(
    () => ({
      entityType: entityType !== "all" ? entityType : undefined,
      action: action !== "all" ? action : undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      page,
      limit: 50,
    }),
    [entityType, action, fromDate, toDate, page],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);

  const hasActiveFilters =
    entityType !== "all" || action !== "all" || !!fromDate || !!toDate;

  const handleClearFilters = useCallback(() => {
    setEntityType("all");
    setAction("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }, []);

  const handleEntityTypeChange = useCallback((val: string) => {
    setEntityType(val as AuditEntityType | "all");
    setPage(1);
  }, []);

  const handleActionChange = useCallback((val: string) => {
    setAction(val as AuditAction | "all");
    setPage(1);
  }, []);

  const handleFromDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setPage(1);
  }, []);

  const handleToDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    const params = new URLSearchParams();
    if (entityType !== "all") params.set("entityType", entityType);
    if (action !== "all") params.set("action", action);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const qs = params.toString();
    window.open(`/crm/audit-logs/export${qs ? `?${qs}` : ""}`, "_blank");
  }, [entityType, action, fromDate, toDate]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => setPage((p) => p + 1), []);

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.ceil(data.total / (data.limit || 50)) : 1;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Complete history of all CRM changes"
      actions={
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
          <Select value={entityType} onValueChange={handleEntityTypeChange}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
              <SelectItem value="deal">Deals</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={handleActionChange}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="status_changed">Status Changed</SelectItem>
              <SelectItem value="stage_changed">Stage Changed</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={fromDate}
              onChange={handleFromDateChange}
              className="h-8 w-36 text-xs"
              aria-label="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={handleToDateChange}
              className="h-8 w-36 text-xs"
              aria-label="To date"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          )}

          {total > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {total.toLocaleString()} entries
            </span>
          )}
        </div>

        {isLoading ? (
          <AuditLogSkeleton />
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <EmptyState
              illustration={<Shield className="h-10 w-10 text-muted-foreground" />}
              title="Failed to load audit log"
              description="Something went wrong. Please try again."
              action={{ label: "Retry", onClick: handleRetry }}
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <EmptyState
              illustration={<Shield className="h-10 w-10 text-muted-foreground" />}
              title="No audit entries found"
              description={
                hasActiveFilters
                  ? "No entries match the current filters."
                  : "All CRM changes will appear here."
              }
              action={
                hasActiveFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : undefined
              }
            />
          </div>
        ) : (
          <>
            <motion.div
              className="space-y-0"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {entries.map((entry, idx) => (
                <AuditEntryRow
                  key={entry.id}
                  entry={entry}
                  isLast={idx === entries.length - 1}
                />
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
