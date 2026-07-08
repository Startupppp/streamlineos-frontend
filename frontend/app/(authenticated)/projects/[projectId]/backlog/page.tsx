"use client";

import { use, useMemo, useCallback, useState, useEffect } from "react";
import { useProject, useSprints } from "@/hooks/api";
import { useBulkUpdateTickets } from "@/hooks/api/projects";
import type { BulkUpdateTicketsInput } from "@/hooks/api/projects";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { BacklogTicketRow } from "@/features/projects/backlog/backlog-ticket-row";
import { BulkActionBar } from "@/features/projects/backlog/bulk-action-bar";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) => t.title?.toLowerCase().includes(lower) || t.description?.toLowerCase().includes(lower),
      );
    }
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.type === filterType);
    if (filterAssigneeId) result = result.filter((t) => t.assigneeId === filterAssigneeId);
    return result;
  }, [tickets, q, filterStatus, filterPriority, filterType, filterAssigneeId]);

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name ?? null,
        firstName: m.user!.firstName ?? null,
        lastName: m.user!.lastName ?? null,
      }));
  }, [data]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, tickets);
      if (href) router.push(href);
    },
    [router, projectId, data?.key, tickets],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(projectId, data.key, selectedTicketId, tickets);
    if (href) router.replace(href);
  }, [selectedTicketId, data, tickets, projectId, router]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredTickets.length
        ? new Set()
        : new Set(filteredTickets.map((t) => t.id)),
    );
  }, [filteredTickets]);

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "sprintId" | "priority">>) => {
      if (selectedIds.size === 0) { toast.error("No tickets selected"); return; }
      bulkUpdate.mutate(
        { ticketIds: Array.from(selectedIds), ...update },
        {
          onSuccess: (d) => {
            toast.success(`${d.updated} ticket${d.updated !== 1 ? "s" : ""} updated`);
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [selectedIds, bulkUpdate],
  );

  const handleBulkStatus = useCallback((v: string) => handleBulkUpdate({ status: v }), [handleBulkUpdate]);
  const handleBulkPriority = useCallback(
    (v: string) => {
      if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "URGENT") {
        handleBulkUpdate({ priority: v });
      }
    },
    [handleBulkUpdate],
  );
  const handleBulkAssignee = useCallback((v: string) => handleBulkUpdate({ assigneeId: v }), [handleBulkUpdate]);
  const handleBulkSprint = useCallback(
    (v: string) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) }),
    [handleBulkUpdate],
  );
  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="Loading...">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="h-8 bg-muted/40 border-b flex items-center px-2 gap-2">
            <Skeleton className="h-4 w-4" />
            {[80, 200, 100, 80, 120].map((w, i) => (
              <Skeleton key={i} className="h-3" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 border-b border-border/50 flex items-center px-2 gap-2">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12 hidden sm:block" />
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Backlog"
      subtitle="Manage and prioritize unscheduled work"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={<TicketFilterBar members={members} showSprintFilter={false} />}
    >
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          members={members}
          sprints={sprints ?? []}
          onBulkStatus={handleBulkStatus}
          onBulkPriority={handleBulkPriority}
          onBulkAssignee={handleBulkAssignee}
          onBulkSprint={handleBulkSprint}
          onClear={handleClearSelection}
        />
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">Backlog tickets</caption>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 px-2 py-1.5" scope="col">
                    <Checkbox
                      checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all tickets"
                    />
                  </TableHead>
                  <TableHead className="w-[80px] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">ID</TableHead>
                  <TableHead className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">Title</TableHead>
                  <TableHead className="w-[120px] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">Status</TableHead>
                  <TableHead className="w-[100px] hidden sm:table-cell px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">Priority</TableHead>
                  <TableHead className="w-[140px] hidden md:table-cell px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">Assignee</TableHead>
                  <TableHead className="w-[110px] hidden lg:table-cell px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground" scope="col">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <EmptyState
                        illustrationPreset="projects"
                        title="No tickets found"
                        description={tickets.length === 0 ? "Create a ticket to get started." : "No tickets match the active filters."}
                        compact
                        className="min-h-[200px] border-0 bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <BacklogTicketRow
                      key={ticket.id}
                      ticket={ticket}
                      projectKey={data?.key}
                      isSelected={selectedIds.has(ticket.id)}
                      onSelect={handleTicketSelect}
                      onToggleSelect={toggleSelect}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </PageWrapper>
  );
}
