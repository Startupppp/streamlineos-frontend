"use client";

import { use, useMemo, useCallback, useState, memo } from "react";
import { useProject, useSprints } from "@/hooks/api";
import { useBulkUpdateTickets } from "@/hooks/api/projects";
import type { BulkUpdateTicketsInput } from "@/hooks/api/projects";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/features/projects/tickets/create-ticket-dialog";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { TicketDetailsDialog } from "@/features/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Layers, X } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";

interface TicketRowProps {
  ticket: {
    id: number;
    ticketNumber: string | number;
    title: string | null;
    description?: string | null;
    status: string;
    priority: string | null;
    type: string;
    assigneeId?: string | null;
    createdAt?: string | Date | null;
    assignee?: {
      image?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  };
  projectKey?: string | null;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

const TicketRow = memo(function TicketRow({
  ticket,
  projectKey,
  isSelected,
  onSelect,
  onToggleSelect,
}: TicketRowProps) {
  const handleRowClick = useCallback(() => onSelect(ticket.id), [onSelect, ticket.id]);
  const handleCheckboxCellClick = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onToggleSelect(ticket.id); },
    [onToggleSelect, ticket.id]
  );
  const handleCheckedChange = useCallback(
    () => onToggleSelect(ticket.id),
    [onToggleSelect, ticket.id]
  );

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 h-8 border-b border-border/50 ${isSelected ? "bg-primary/5" : ""}`}
      onClick={handleRowClick}
    >
      <TableCell className="px-2 py-1" onClick={handleCheckboxCellClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckedChange}
          aria-label={`Select ticket ${ticket.ticketNumber}`}
        />
      </TableCell>
      <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />
          {formatTicketKey(projectKey, ticket.ticketNumber)}
        </span>
      </TableCell>
      <TableCell className="px-2 py-1 max-w-md">
        <span className="text-[11px] font-medium line-clamp-1">{ticket.title}</span>
      </TableCell>
      <TableCell className="px-2 py-1">
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="px-2 py-1 hidden sm:table-cell">
        <PriorityBadge priority={ticket.priority} showLabel />
      </TableCell>
      <TableCell className="px-2 py-1 hidden md:table-cell">
        {ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-[8px]">
                {ticket.assignee.firstName?.[0]}
                {ticket.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] truncate">
              {ticket.assignee.firstName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell">
        {ticket.createdAt
          ? format(new Date(ticket.createdAt), "MMM d")
          : "—"}
      </TableCell>
    </TableRow>
  );
});

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
        (t) =>
          t.title?.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower)
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
      const params = new URLSearchParams(searchParams.toString());
      params.set("ticket", String(id));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleTicketClose = useCallback(
    (open: boolean) => {
      if (!open) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("ticket");
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    },
    [router, searchParams]
  );

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
        : new Set(filteredTickets.map((t) => t.id))
    );
  }, [filteredTickets]);

  const handleBulkUpdate = useCallback(
    (update: Partial<Pick<BulkUpdateTicketsInput, "assigneeId" | "status" | "sprintId" | "priority">>) => {
      if (selectedIds.size === 0) {
        toast.error("No tickets selected");
        return;
      }
      bulkUpdate.mutate(
        { ticketIds: Array.from(selectedIds), ...update },
        {
          onSuccess: (data) => {
            toast.success(`${data.updated} ticket${data.updated !== 1 ? "s" : ""} updated`);
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [selectedIds, bulkUpdate]
  );

  const handleBulkStatus = useCallback(
    (value: string) => handleBulkUpdate({ status: value }),
    [handleBulkUpdate]
  );

  const handleBulkPriority = useCallback(
    (value: string) => {
      if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "URGENT") {
        handleBulkUpdate({ priority: value });
      }
    },
    [handleBulkUpdate]
  );

  const handleBulkAssignee = useCallback(
    (value: string) => handleBulkUpdate({ assigneeId: value }),
    [handleBulkUpdate]
  );

  const handleBulkSprint = useCallback(
    (value: string) => handleBulkUpdate({ sprintId: value === "backlog" ? null : Number(value) }),
    [handleBulkUpdate]
  );

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="Loading..." backHref={`/projects/${projectId}`}>
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
      subtitle={`${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
      backHref={`/projects/${projectId}`}
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={<TicketFilterBar members={members} showSprintFilter={false} />}
    >
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-background border-b border-border px-4 py-2 mb-2">
          <span className="text-sm font-medium text-primary shrink-0">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Select onValueChange={handleBulkStatus}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Set Status" /></SelectTrigger>
              <SelectContent>
                {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleBulkPriority}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Set Priority" /></SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleBulkAssignee}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Assign to" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.firstName ?? m.name ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleBulkSprint}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Move to Sprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog" className="text-xs">Backlog (remove sprint)</SelectItem>
                {(sprints ?? []).filter((s) => s.status !== "COMPLETED").map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
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
                <TicketRow
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

      <TicketDetailsDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={handleTicketClose}
        projectId={projectId}
        statuses={statuses?.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageWrapper>
  );
}
