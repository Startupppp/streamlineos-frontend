"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useOrgAuditLog, useUsers } from "@/hooks/api/users";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { History } from "lucide-react";
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

function buildColumns(userMap: Map<string, string>): DataTableColumn<AuditEntry>[] {
  return [
    {
      key: "actor",
      header: "Actor",
      cell: (row) => {
        const name = row.actorUserId
          ? (userMap.get(row.actorUserId) ?? "Unknown")
          : "System";
        return (
          <span className="text-sm text-foreground max-w-[160px] truncate block">
            {name}
          </span>
        );
      },
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
        <span className="text-muted-foreground capitalize">
          {row.resourceType ?? "—"}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      cell: (row) => (
        <span className="text-muted-foreground font-mono">{row.ipAddress ?? "—"}</span>
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
}

export function OrgAuditLogPage() {
  const [page, setPage] = useState(1);
  const [actorSearch, setActorSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  const { data: usersData } = useUsers({ limit: 100 });
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of usersData?.data ?? []) {
      map.set(u.id, getUserDisplayName(u));
    }
    return map;
  }, [usersData]);

  const columns = useMemo(() => buildColumns(userMap), [userMap]);

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

  const handleActorSearch = useCallback((value: string) => {
    setActorSearch(value);
    setPage(1);
  }, []);

  const handleFromChange = useCallback((value: string) => {
    setFrom(value);
    setPage(1);
  }, []);

  const handleToChange = useCallback((value: string) => {
    setTo(value);
    setPage(1);
  }, []);

  const handleActionFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setActionFilter(e.target.value);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setActorSearch("");
    setActionFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  }, []);

  const hasFilters = actorSearch || actionFilter || from || to;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Organization-wide audit trail of user management actions."
      badge={pagination?.total !== undefined ? String(pagination.total) : undefined}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            className="w-44"
            placeholder="Filter by actor ID..."
            value={actorSearch}
            onValueChange={handleActorSearch}
          />
          <Input
            placeholder="Action (e.g. user.invite)"
            value={actionFilter}
            onChange={handleActionFilterChange}
            className="w-44"
          />
          <DatePicker value={from} onChange={handleFromChange} placeholder="From" className="w-36" />
          <DatePicker value={to} onChange={handleToChange} placeholder="To" className="w-36" />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
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
          onPageChange: handlePageChange,
        }}
      />
    </PageWrapper>
  );
}
