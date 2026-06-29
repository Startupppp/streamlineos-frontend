"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useOrgAuditLog } from "@/lib/api/hooks/users";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function RowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-3.5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
    </TableRow>
  );
}

function actionVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("invite")) return "default";
  return "secondary";
}

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

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFrom(e.target.value);
    setPage(1);
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTo(e.target.value);
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
          <Input
            type="date"
            value={from}
            onChange={handleFromChange}
            className="h-8 text-xs w-36"
            title="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={handleToChange}
            className="h-8 text-xs w-36"
            title="To date"
          />
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
      {isLoading ? (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs">Actor</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Resource</TableHead>
                <TableHead className="text-xs">IP</TableHead>
                <TableHead className="text-xs">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : entries.length === 0 ? (
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
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs">Actor</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Resource</TableHead>
                  <TableHead className="text-xs">IP</TableHead>
                  <TableHead className="text-xs">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate">
                      {entry.actorUserId ?? "system"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={actionVariant(entry.action)}
                        className="text-[10px] h-5 px-1.5 font-normal font-mono"
                      >
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.resourceType
                        ? `${entry.resourceType}${entry.resourceId ? ` / ${entry.resourceId.slice(0, 8)}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {entry.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2">{page} / {pagination.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
