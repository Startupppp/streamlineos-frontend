"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "archived"
  | "restored"
  | "assigned"
  | "unassigned"
  | "status_changed"
  | "stage_changed"
  | "converted"
  | "merged"
  | "exported"
  | "imported";

export type AuditEntityType =
  | "lead"
  | "contact"
  | "company"
  | "deal"
  | "task"
  | "quote"
  | "user"
  | "settings";

export interface AuditLogEntry {
  id: number;
  action: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetId: string | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuditFilters {
  targetType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ["crm-audit-logs", filters] as const,
    queryFn: () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined),
      );
      return apiClient.get<AuditLogsResponse>("/audit-log", params);
    },
    staleTime: 30_000,
  });
}

const ACTION_BADGE_COLORS: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated: "bg-blue-50 text-blue-700 border-blue-200",
  deleted: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
  restored: "bg-emerald-50 text-emerald-600 border-emerald-200",
  assigned: "bg-violet-50 text-violet-700 border-violet-200",
  unassigned: "bg-violet-50 text-violet-600 border-violet-200",
  status_changed: "bg-amber-50 text-amber-700 border-amber-200",
  stage_changed: "bg-amber-50 text-amber-700 border-amber-200",
  converted: "bg-blue-50 text-blue-700 border-blue-200",
  merged: "bg-blue-50 text-blue-700 border-blue-200",
  exported: "bg-blue-50 text-blue-600 border-blue-200",
  imported: "bg-blue-50 text-blue-600 border-blue-200",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  contact: "Contact",
  company: "Company",
  deal: "Deal",
  task: "Task",
  quote: "Quote",
  user: "User",
  settings: "Settings",
};

const ACTION_LABELS: Record<string, string> = {
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

function isChangeObject(val: unknown): val is { from: unknown; to: unknown } {
  return typeof val === "object" && val !== null && "from" in val;
}

export function buildDescription(entry: AuditLogEntry): string {
  const entityLabel = entry.targetType
    ? (ENTITY_TYPE_LABELS[entry.targetType] ?? entry.targetType)
    : "entity";
  const actionLabel = ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ");

  const statusChange = entry.metadata?.status;
  if (entry.action === "status_changed" && statusChange !== undefined && isChangeObject(statusChange)) {
    return `${actionLabel} ${entityLabel} — ${String(statusChange.from ?? "—")} → ${String(statusChange.to ?? "—")}`;
  }
  const stageChange = entry.metadata?.stage;
  if (entry.action === "stage_changed" && stageChange !== undefined && isChangeObject(stageChange)) {
    return `${actionLabel} ${entityLabel} — ${String(stageChange.from ?? "—")} → ${String(stageChange.to ?? "—")}`;
  }
  return `${actionLabel} ${entityLabel}`;
}

interface ChangesDisplayProps {
  metadata: Record<string, unknown>;
}

function ChangesDisplay({ metadata }: ChangesDisplayProps) {
  const entries = Object.entries(metadata).slice(0, 3);
  const overflow = Object.keys(metadata).length - 3;
  return (
    <div className="mt-1 space-y-0.5">
      {entries.map(([field, val]) => {
        const change = isChangeObject(val) ? val : null;
        const from = change ? String(change.from ?? "—") : "—";
        const to = change ? String(change.to ?? "—") : String(val ?? "—");
        return (
          <p key={field} className="text-xs text-muted-foreground">
            <span className="font-medium">{field}</span>:{" "}
            <span className="text-red-500 line-through">{from}</span>
            {" → "}
            <span className="text-emerald-600">{to}</span>
          </p>
        );
      })}
      {overflow > 0 && (
        <p className="text-xs text-muted-foreground">+{overflow} more changes</p>
      )}
    </div>
  );
}

const REDUCED_ITEM_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

interface AuditEntryRowProps {
  entry: AuditLogEntry;
  isLast: boolean;
}

export function AuditEntryRow({ entry, isLast }: AuditEntryRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? REDUCED_ITEM_VARIANTS : fadeUp;

  const displayName = entry.userName ?? entry.userEmail ?? "Unknown";
  const initials = displayName
    .split(" ")
    .map((n) => n[0] ?? "")
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

  const badgeColor = ACTION_BADGE_COLORS[entry.action] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const entityLabel = entry.targetType
    ? (ENTITY_TYPE_LABELS[entry.targetType] ?? entry.targetType)
    : undefined;

  return (
    <motion.div variants={variants} className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
          {initials}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
        <div className="bg-card rounded-lg border border-border shadow-sm p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{displayName}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 h-4 font-medium",
                    badgeColor,
                  )}
                >
                  {entry.action.replace(/_/g, " ")}
                </Badge>
                {entityLabel && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                    {entityLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{buildDescription(entry)}</p>
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <ChangesDisplay metadata={entry.metadata} />
              )}
              {entry.ipAddress && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  IP: {entry.ipAddress}
                </p>
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

export function AuditLogSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="w-px flex-1 bg-border/30 mt-1" />
          </div>
          <div className="flex-1 pb-4">
            <div className="h-16 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
