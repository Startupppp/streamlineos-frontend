"use client";

import { useProject } from "@/lib/hooks/trpc-hooks";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { use } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const { data, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="p-8 h-full flex flex-col space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return notFound();

  // Sort tickets: TODO first, then others. Or by priority. 
  // For backlog, usually we show everything not in strict "DONE".
  // But let's show all for now.
  const tickets = data.tickets || [];

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Backlog</h1>
          <p className="text-muted-foreground">Manage your project tickets</p>
        </div>
        <CreateTicketDialog projectId={projectId} />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No tickets found. Create one to get started.
                    </TableCell>
                </TableRow>
            ) : (
                tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>
                    <Badge variant="outline">{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>
                    <Badge variant={ticket.type === "BUG" ? "destructive" : "secondary"}>
                        {ticket.type}
                    </Badge>
                    </TableCell>
                    <TableCell>
                        {ticket.priority && (
                             <Badge variant="outline" className="text-[10px]">
                                 {ticket.priority}
                             </Badge>
                        )}
                    </TableCell>
                    <TableCell>
                    {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                {ticket.assignee.firstName?.[0]}
                                {ticket.assignee.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                                {ticket.assignee.firstName} {ticket.assignee.lastName}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                    )}
                    </TableCell>
                    <TableCell className="text-right">{ticket.points || "-"}</TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
