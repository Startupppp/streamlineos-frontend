"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useOrgAuditLog } from "@/hooks/api/users";
import { History, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AuditEntry = {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
};

function actionVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("invite")) return "default";
  return "secondary";
}

const columns: DataTableColumn<AuditEntry>[] = [
  {
    key: "actor",
    header: "Actor",
    cell: (row) => (
      <span className="font-mono text-muted-foreground max-w-[140px] truncate block">
        {row.actorUserId ?? "system"}
      </span>
    ),
  },
  {
    key: "action",
    header: "Action",
    cell: (row) => (
      <Badge
        variant={actionVariant(row.action)}
        className="text-[10px] h-5 px-1.5 font-normal font-mono"
      >
        {row.action}
      </Badge>
    ),
  },
  {
    key: "resource",
    header: "Resource",
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.resourceType
          ? `${row.resourceType}${row.resourceId ? ` / ${row.resourceId.slice(0, 8)}` : ""}`
          : "???"}
      </span>
    ),
  },
  {
    key: "ip",
    header: "IP",
    cell: (row) => (
      <span className="text-muted-foreground font-mono">{row.ipAddress ?? "???"}</span>
    ),
  },
  {
    key: "when",
    header: "When",
    cell: (row) => (
      <span className="text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
      </span>
    ),
  },
];

export function OrgAuditLogPage() {
  const [page, setPage] = useState(1);
  const [actorSearch, setActorSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useOrgAuditLog({
    page,
    limit: 20,
    ...(actorSearch ? { actorUserId: actorSearch } : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  function handleActorSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setActorSearch(e.target.value);
    setPage(1);
  }

  function handleFromChange(value: string) {
    setFrom(value);
    setPage(1);
  }

  function handleToChange(value: string) {
    setTo(value);
    setPage(1);
  }

  function handleClearFilters() {
    setActorSearch("");
    setActionFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = actorSearch || actionFilter || from || to;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Organization-wide audit trail of user management actions."
      badge={pagination?.total !== undefined ? String(pagination.total) : undefined}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by actor ID..."
              value={actorSearch}
              onChange={handleActorSearch}
              className="pl-8 h-8 text-xs w-44"
            />
          </div>
          <Input
            placeholder="Action (e.g. user.invite)"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-8 text-xs w-44"
          />
          <DatePicker value={from} onChange={handleFromChange} placeholder="From" className="h-8 text-xs w-36" />
          <DatePicker value={to} onChange={handleToChange} placeholder="To" className="h-8 text-xs w-36" />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      }
    >
      <DataTable
        className="flex-1 min-h-0"
        data={entries}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustration={<History className="text-muted-foreground/40" />}
            title="No audit events"
            description={
              hasFilters
                ? "No events match your filters."
                : "No audit events recorded yet."
            }
            action={
              hasFilters
                ? { label: "Clear filters", onClick: handleClearFilters }
                : undefined
            }
          />
        }
        pagination={{
          mode: "server",
          page,
          pageSize: 20,
          total: pagination?.total ?? 0,
          onPageChange: (p) => setPage(p),
        }}
      />
    </PageWrapper>
  );
}
