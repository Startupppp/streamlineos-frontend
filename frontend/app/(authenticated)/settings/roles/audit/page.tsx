"use client";

import { useState, useCallback } from "react";
import { ClipboardList, ShieldCheck, ShieldX, UserCheck, UserX } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useAuditLogs } from "@/hooks/api/audit-log";
import type { AuditLogRow as AuditLogEntry } from "@/hooks/api/audit-log";
import { getInitials } from "@/lib/format-utils";

const RBAC_ACTIONS = [
  "role.changed",
  "role.permissions.set",
  "role.member.added",
  "role.member.removed",
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
  "role.changed": { label: "Role Changed", variant: "secondary", Icon: ShieldCheck },
  "role.permissions.set": { label: "Permissions Updated", variant: "default", Icon: ShieldCheck },
  "role.member.added": { label: "Member Added", variant: "default", Icon: UserCheck },
  "role.member.removed": { label: "Member Removed", variant: "secondary", Icon: UserX },
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
    <DashboardGate permission="audit-log:read">
      <AuditContent />
    </DashboardGate>
  );
}

function resolveTargetLabel(log: AuditLogEntry): string | null {
  const meta = log.metadata;
  if (!meta) return log.targetType ?? null;
  if (typeof meta.roleName === "string") return meta.roleName;
  if (typeof meta.permissionKey === "string") return meta.permissionKey;
  return log.targetType ?? null;
}

function resolveAffectedUser(log: AuditLogEntry): string | null {
  const meta = log.metadata;
  if (!meta) return null;
  if (typeof meta.targetUserName === "string") return meta.targetUserName;
  if (typeof meta.targetUserEmail === "string") return meta.targetUserEmail;
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

const columns: DataTableColumn<AuditLogEntry>[] = [
  {
    key: "when",
    header: "When",
    className: "whitespace-nowrap",
    cell: (log) => (
      <span className="text-dense text-muted-foreground whitespace-nowrap">
        {formatTimestamp(log.createdAt)}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    cell: (log) => {
      const displayName = log.userName ?? log.userEmail ?? "Unknown";
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={log.userImage ?? undefined} />
            <AvatarFallback className="text-micro">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate max-w-[140px]">{log.userName ?? log.userEmail ?? "Unknown"}</p>
            {log.userName && log.userEmail && (
              <p className="text-micro text-muted-foreground truncate max-w-[140px]">{log.userEmail}</p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    key: "action",
    header: "Action",
    className: "whitespace-nowrap",
    cell: (log) => {
      const meta = ACTION_META[log.action];
      return meta ? (
        <Badge variant={meta.variant} className="text-micro px-1.5 gap-1 whitespace-nowrap">
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-micro px-1.5 font-mono whitespace-nowrap">
          {log.action}
        </Badge>
      );
    },
  },
  {
    key: "target",
    header: "Target",
    cell: (log) => {
      const targetLabel = resolveTargetLabel(log);
      return targetLabel ? (
        <span className="font-mono text-dense bg-muted/40 px-1.5 py-0.5 rounded">{targetLabel}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    key: "affected-user",
    header: "Affected User",
    cell: (log) => {
      const affectedUser = resolveAffectedUser(log);
      return (
        <span className="text-dense text-muted-foreground">
          {affectedUser ?? "—"}
        </span>
      );
    },
  },
];

function AuditContent() {
  const [page, setPage] = useState(1);

  const query = useAuditLogs({ page, pageSize: PAGE_SIZE, actions: RBAC_ACTIONS });

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  return (
    <PageWrapper
      title="Access Audit Log"
      subtitle="Track role and permission changes across your organization"
      backHref="/settings/roles"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {query.isError && (
          <ErrorState
            title="Failed to load audit log"
            description="Something went wrong while fetching audit events"
            onRetry={handleRetry}
            className="flex-1"
          />
        )}

        {!query.isError && (
          <DataTable
            data={query.data?.logs ?? []}
            columns={columns}
            getRowKey={(log) => log.id}
            isLoading={query.isLoading}
            emptyState={<AuditEmptyState />}
            className="flex-1 min-h-0"
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: query.data?.total ?? 0,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>
    </PageWrapper>
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
