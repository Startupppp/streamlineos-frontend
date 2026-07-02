"use client";

import { useState, useCallback } from "react";
import { ClipboardList, ShieldCheck, ShieldX, UserCheck, UserX } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLogs } from "@/hooks/api/audit-log";
import type { AuditLogRow as AuditLogEntry } from "@/hooks/api/audit-log";
import { getInitials } from "@/lib/format-utils";

const RBAC_ACTIONS = [
  "role.assigned",
  "role.unassigned",
  "role.created",
  "role.updated",
  "role.deleted",
  "permission.granted",
  "permission.revoked",
];

type ActionVariant = "default" | "secondary" | "outline" | "destructive";

const ACTION_META: Record<string, { label: string; variant: ActionVariant; Icon: React.ElementType }> = {
  "role.assigned": { label: "Role Assigned", variant: "default", Icon: UserCheck },
  "role.unassigned": { label: "Role Unassigned", variant: "secondary", Icon: UserX },
  "role.created": { label: "Role Created", variant: "default", Icon: ShieldCheck },
  "role.updated": { label: "Role Updated", variant: "secondary", Icon: ShieldCheck },
  "role.deleted": { label: "Role Deleted", variant: "destructive", Icon: ShieldX },
  "permission.granted": { label: "Permission Granted", variant: "default", Icon: ShieldCheck },
  "permission.revoked": { label: "Permission Revoked", variant: "destructive", Icon: ShieldX },
};

const PAGE_SIZE = 25;

export default function AuditPage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <AuditContent />
    </DashboardGate>
  );
}

function AuditContent() {
  const [page, setPage] = useState(1);

  const query = useAuditLogs({ page, pageSize: PAGE_SIZE, targetType: "role" });

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const rbacLogs = query.data?.logs.filter(
    (log) => RBAC_ACTIONS.includes(log.action),
  ) ?? [];

  return (
    <PageWrapper
      title="Access Audit Log"
      subtitle="Track role and permission changes across your organization"
      backHref="/settings/roles"
      eyebrow="Settings / Roles"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {query.isLoading && <AuditLoadingSkeleton />}

        {query.isError && (
          <ErrorState
            title="Failed to load audit log"
            description="Something went wrong while fetching audit events"
            onRetry={handleRetry}
            className="flex-1 min-h-[320px]"
          />
        )}

        {query.isSuccess && rbacLogs.length === 0 && (
          <AuditEmptyState />
        )}

        {query.isSuccess && rbacLogs.length > 0 && (
          <>
            <Card>
              <ScrollArea type="auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b-2 border-border text-muted-foreground">
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">When</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">Actor</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">Action</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">Target</th>
                        <th className="text-left px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">Affected User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {rbacLogs.map((log) => (
                        <AuditLogRow key={log.id} log={log} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </Card>

            <div className="flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground">
                Page {query.data.page} of {query.data.totalPages} &mdash; {query.data.total} events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page <= 1 || query.isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= (query.data.totalPages ?? 1) || query.isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

interface AuditLogRowProps {
  log: AuditLogEntry;
}

function AuditLogRow({ log }: AuditLogRowProps) {
  const meta = ACTION_META[log.action];
  const displayName = log.userName ?? log.userEmail ?? log.userId;
  const targetLabel = resolveTargetLabel(log);
  const affectedUser = resolveAffectedUser(log);

  return (
    <tr className="h-8 hover:bg-muted/30 transition-colors">
      <td className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
        {formatTimestamp(log.createdAt)}
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={log.userImage ?? undefined} />
            <AvatarFallback className="text-[9px]">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate max-w-[140px]">{log.userName ?? log.userEmail ?? "Unknown"}</p>
            {log.userName && log.userEmail && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{log.userEmail}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-2 py-1 whitespace-nowrap">
        {meta ? (
          <Badge variant={meta.variant} className="text-[10px] px-1.5 gap-1 whitespace-nowrap">
            <meta.Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 font-mono whitespace-nowrap">
            {log.action}
          </Badge>
        )}
      </td>
      <td className="px-2 py-1 text-[11px] text-foreground">
        {targetLabel ? (
          <span className="font-mono text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">{targetLabel}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-1 text-[11px] text-muted-foreground">
        {affectedUser ?? <span>—</span>}
      </td>
    </tr>
  );
}

function resolveTargetLabel(log: AuditLogEntry): string | null {
  const meta = log.metadata;
  if (!meta) return log.targetId;
  if (typeof meta.roleName === "string") return meta.roleName;
  if (typeof meta.permissionKey === "string") return meta.permissionKey;
  if (typeof meta.roleId === "number") return `Role #${meta.roleId}`;
  return log.targetId;
}

function resolveAffectedUser(log: AuditLogEntry): string | null {
  const meta = log.metadata;
  if (!meta) return null;
  if (typeof meta.targetUserName === "string") return meta.targetUserName;
  if (typeof meta.targetUserEmail === "string") return meta.targetUserEmail;
  if (typeof meta.userId === "string" && meta.userId !== log.userId) return meta.userId;
  return null;
}

function formatTimestamp(value: Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function AuditLoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-3 w-28 shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full shrink-0" />
              <Skeleton className="h-3 w-24 shrink-0" />
              <Skeleton className="h-3 w-24 shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


function AuditEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[320px]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No audit events yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
          Role and permission changes will be recorded here as they happen
        </p>
      </div>
    </div>
  );
}
