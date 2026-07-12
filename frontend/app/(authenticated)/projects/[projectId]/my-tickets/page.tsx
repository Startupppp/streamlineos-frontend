"use client";

import { use, useMemo, useCallback, useEffect } from "react";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useProject } from "@/hooks/api";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { TicketFilterBar } from "@/features/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/features/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/features/projects/shared/priority-badge";
import { StatusBadge } from "@/features/projects/shared/status-badge";
import { buildTicketDetailUrl } from "@/features/projects/ticket-details/build-ticket-detail-url";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatTicketKey } from "@/features/projects/shared/format-ticket-key";

interface MyTicket {
  id: number;
  type: string;
  ticketNumber: string | number;
  title: string | null;
  status: string;
  priority: string | null;
  points?: number | null;
  dueDate?: string | Date | null;
  description?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  assignees?: { userId: string }[] | null;
}

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
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.type === filterType);
    return result;
  }, [myTickets, q, filterStatus, filterPriority, filterType]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const href = buildTicketDetailUrl(projectId, data?.key, id, myTickets);
      if (href) router.push(href);
    },
    [router, projectId, data?.key, myTickets],
  );

  const handleRowClick = useCallback(
    (ticket: MyTicket) => handleTicketSelect(ticket.id),
    [handleTicketSelect],
  );

  useEffect(() => {
    if (!selectedTicketId || !data) return;
    const href = buildTicketDetailUrl(projectId, data.key, selectedTicketId, myTickets);
    if (href) router.replace(href);
  }, [selectedTicketId, data, myTickets, projectId, router]);

  const columns = useMemo<DataTableColumn<MyTicket>[]>(
    () => [
      {
        key: "id",
        header: "ID",
        className: "w-[80px] font-mono text-xs text-muted-foreground",
        cell: (ticket) => (
          <span className="flex items-center gap-1.5">
            <TicketTypeIcon type={ticket.type} />
            {formatTicketKey(data?.key, ticket.ticketNumber)}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        className: "max-w-md",
        cell: (ticket) => (
          <span className="text-sm font-medium line-clamp-1">{ticket.title}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "w-[120px]",
        cell: (ticket) => <StatusBadge status={ticket.status} />,
      },
      {
        key: "priority",
        header: "Priority",
        className: "hidden sm:table-cell w-[100px]",
        headerClassName: "hidden sm:table-cell",
        cell: (ticket) => <PriorityBadge priority={ticket.priority} showLabel />,
      },
      {
        key: "points",
        header: "Points",
        className: "hidden md:table-cell w-[80px]",
        headerClassName: "hidden md:table-cell",
        cell: (ticket) =>
          ticket.points != null && ticket.points > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {ticket.points}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        key: "dueDate",
        header: "Due Date",
        className: "hidden md:table-cell w-[100px] text-xs text-muted-foreground",
        headerClassName: "hidden md:table-cell",
        cell: (ticket) =>
          ticket.dueDate ? format(new Date(ticket.dueDate), "MMM d") : "—",
      },
    ],
    [data?.key],
  );

  if (isLoading) {
    return (
      <PageWrapper title="My Tickets" subtitle="Tickets assigned to or reported by you">
        <DataTableSkeleton rows={8} columns={6} />
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="My Tickets"
      subtitle="Tickets assigned to or reported by you"
      filters={
        <TicketFilterBar showSprintFilter={false} showAssigneeFilter={false} />
      }
    >
      <DataTable
        data={filteredTickets}
        columns={columns}
        getRowKey={(ticket) => ticket.id}
        onRowClick={handleRowClick}
        minWidth="640px"
        emptyState={
          myTickets.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center min-h-[400px]">
              <EmptyTasksIllustration className="mb-4 h-40 w-40 opacity-95" />
              <p className="font-medium text-foreground mb-1">No tickets assigned to you</p>
              <p className="text-sm text-muted-foreground">
                Tickets you create or get assigned to will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <EmptyTasksIllustration className="h-32 w-32 opacity-95" />
              <p className="text-sm text-muted-foreground">No tickets match your filters.</p>
            </div>
          )
        }
      />
    </PageWrapper>
  );
}
