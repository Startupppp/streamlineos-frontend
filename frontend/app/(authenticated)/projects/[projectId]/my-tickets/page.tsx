"use client";

import { use, useMemo, useCallback, memo } from "react";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useProject } from "@/hooks/api";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { TicketDetailsDialog } from "@/features/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface MyTicketRowProps {
  ticket: {
    id: number;
    type: string;
    ticketNumber: string | number;
    title: string | null;
    status: string;
    priority: string | null;
    points?: number | null;
    dueDate?: string | Date | null;
  };
  onSelect: (id: number) => void;
}

const TicketRow = memo(function TicketRow({
  ticket,
  onSelect,
}: MyTicketRowProps) {
  const handleClick = useCallback(
    () => onSelect(ticket.id),
    [onSelect, ticket.id],
  );

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 h-10 border-b border-border/50"
      onClick={handleClick}
    >
      <TableCell className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <TicketTypeIcon type={ticket.type} />#{ticket.ticketNumber}
        </span>
      </TableCell>
      <TableCell className="px-3 py-1.5 max-w-md">
        <span className="text-sm font-medium line-clamp-1">{ticket.title}</span>
      </TableCell>
      <TableCell className="px-3 py-1.5">
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="px-3 py-1.5 hidden sm:table-cell">
        <PriorityBadge priority={ticket.priority} showLabel />
      </TableCell>
      <TableCell className="px-3 py-1.5 hidden md:table-cell">
        {ticket.points != null && ticket.points > 0 ? (
          <Badge variant="secondary" className="text-xs">
            {ticket.points}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-1.5 text-xs text-muted-foreground hidden md:table-cell">
        {ticket.dueDate ? format(new Date(ticket.dueDate), "MMM d") : "—"}
      </TableCell>
    </TableRow>
  );
});

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function MyTicketsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = session?.user?.id;

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";

  const myTickets = useMemo(() => {
    if (!data?.tickets || !userId) return [];
    return data.tickets.filter((t) => {
      if (t.assigneeId === userId) return true;

      if (t.assignees?.some((a) => a.userId === userId)) return true;

      if (t.reporterId === userId) return true;
      return false;
    });
  }, [data?.tickets, userId]);

  const filteredTickets = useMemo(() => {
    let result = myTickets;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower),
      );
    }
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterPriority)
      result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.type === filterType);
    return result;
  }, [myTickets, q, filterStatus, filterPriority, filterType]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("ticket", String(id));
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleTicketClose = useCallback(
    (open: boolean) => {
      if (!open) {
        const p = new URLSearchParams(searchParams.toString());
        p.delete("ticket");
        router.replace(`?${p.toString()}`, { scroll: false });
      }
    },
    [router, searchParams],
  );

  const statuses =
    data && "statuses" in data
      ? (data.statuses as {
          id: number;
          name: string;
          color: string | null;
          order: number;
        }[])
      : undefined;

  const todoCount = myTickets.filter((t) => t.status === "TODO").length;
  const inProgressCount = myTickets.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const doneCount = myTickets.filter((t) => t.status === "DONE").length;

  if (isLoading) {
    return (
      <PageWrapper title="My Tickets" subtitle="Tickets assigned to you">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="My Tickets"
      subtitle={`${myTickets.length} ticket${myTickets.length !== 1 ? "s" : ""} assigned to you`}
      badge={
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{todoCount} todo</span>
          <span className="text-blue-500">{inProgressCount} active</span>
          <span className="text-green-500">{doneCount} done</span>
        </div>
      }
      filters={
        <TicketFilterBar showSprintFilter={false} showAssigneeFilter={false} />
      }
    >
      {myTickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center min-h-[400px]">
          <EmptyTasksIllustration className="mb-4 h-40 w-40 opacity-95" />
          <p className="font-medium text-foreground mb-1">
            No tickets assigned to you
          </p>
          <p className="text-sm text-muted-foreground">
            Tickets you create or get assigned to will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden mx-4 mb-4">
          <div className="overflow-x-auto">
          <Table>
            <caption className="sr-only">My tickets</caption>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[80px] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">
                  ID
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">Title</TableHead>
                <TableHead className="w-[120px] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">
                  Status
                </TableHead>
                <TableHead className="w-[100px] hidden sm:table-cell px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">
                  Priority
                </TableHead>
                <TableHead className="w-[80px] hidden md:table-cell px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">
                  Points
                </TableHead>
                <TableHead className="w-[100px] hidden md:table-cell px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground" scope="col">
                  Due Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <EmptyTasksIllustration className="h-32 w-32 opacity-95" />
                      <p>No tickets match your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onSelect={handleTicketSelect}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
