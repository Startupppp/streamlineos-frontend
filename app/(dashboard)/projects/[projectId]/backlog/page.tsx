"use client";

import { use, useMemo, useCallback } from "react";
import Image from "next/image";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { TicketFilterBar } from "@/components/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/components/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/components/projects/shared/priority-badge";
import { StatusBadge } from "@/components/projects/shared/status-badge";
import { TicketDetailsDialog } from "@/components/projects/ticket-details/ticket-details-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  // URL filters
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

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="All tickets">
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={<TicketFilterBar members={members} showSprintFilter={false} />}
    >
      <div className="border rounded-lg mx-4 mb-4">
        <Table>
          <caption className="sr-only">Backlog tickets</caption>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[80px]" scope="col">ID</TableHead>
              <TableHead scope="col">Title</TableHead>
              <TableHead className="w-[120px]" scope="col">Status</TableHead>
              <TableHead className="w-[100px]" scope="col">Priority</TableHead>
              <TableHead className="w-[140px]" scope="col">Assignee</TableHead>
              <TableHead className="w-[110px]" scope="col">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Image
                      src="/illustrations/undraw-task-brief.svg"
                      alt="No tickets"
                      width={180}
                      height={140}
                      className="opacity-90"
                    />
                    <p>No tickets found. Create one to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleTicketSelect(ticket.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <TicketTypeIcon type={ticket.type} />
                      #{ticket.ticketNumber}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="text-sm font-medium line-clamp-1">{ticket.title}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} showLabel />
                  </TableCell>
                  <TableCell>
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
                          <AvatarFallback className="text-[8px]">
                            {ticket.assignee.firstName?.[0]}
                            {ticket.assignee.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">
                          {ticket.assignee.firstName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {ticket.createdAt
                      ? format(new Date(ticket.createdAt), "MMM d")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
