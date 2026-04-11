"use client";

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
import Link from "next/link";
type Ticket = {
    id: number;
    title: string;
    status: string;
    priority: string | null;
    updatedAt: Date | null;
    project: {
        id: number;
        name: string;
        key: string;
    } | null;
    sprint: {
        name: string;
    } | null;
};

interface EmployeeTicketsListProps {
  tickets: Ticket[];
}

export function EmployeeTicketsList({ tickets }: EmployeeTicketsListProps) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No assigned tickets found.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Sprint</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">
                  {ticket.project?.key}-{ticket.id}
              </TableCell>
              <TableCell>{ticket.title}</TableCell>
              <TableCell>
                  {ticket.project ? (
                     <Link href={`/projects/${ticket.project.id}`} className="hover:underline text-primary">
                        {ticket.project.name}
                     </Link>
                  ) : "-"}
              </TableCell>
              <TableCell>{ticket.sprint?.name || "-"}</TableCell>
              <TableCell>
                <Badge variant="outline">{ticket.status}</Badge>
              </TableCell>
               <TableCell>
                <Badge
                    variant={
                        ticket.priority === "URGENT" || ticket.priority === "HIGH"
                        ? "destructive"
                        : ticket.priority === "MEDIUM"
                        ? "default"
                        : "secondary"
                    }
                >
                    {ticket.priority || "MEDIUM"}
                </Badge>
              </TableCell>
              <TableCell>
                {ticket.updatedAt ? format(new Date(ticket.updatedAt), "MMM d, yyyy") : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
