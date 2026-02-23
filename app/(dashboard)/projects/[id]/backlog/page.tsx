"use client";

import { useProject } from "@/lib/hooks/trpc-hooks";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { use, useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Search, Filter } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const { data, isLoading } = useProject(projectId);

  const [searchQuery, setSearchQuery] = useState("");
  const [endDate, setEndDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);

  const uniqueAssignees = useMemo(() => {
    const assignees = tickets
      .filter((t) => t.assignee)
      .map((t) => ({
        id: t.assignee!.id,
        name: `${t.assignee!.firstName || ""} ${
          t.assignee!.lastName || ""
        }`.trim(),
      }));

    const uniqueMap = new Map(assignees.map((a) => [a.id, a]));
    return Array.from(uniqueMap.values());
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          ticket.title?.toLowerCase().includes(query) ||
          ticket.id.toString().includes(query) ||
          ticket.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (selectedAssignee !== "all") {
        if (selectedAssignee === "unassigned") {
          if (ticket.assignee) return false;
        } else {
          if (!ticket.assignee || ticket.assignee.id !== selectedAssignee)
            return false;
        }
      }

      if (selectedPriority !== "all" && ticket.priority !== selectedPriority) {
        return false;
      }

      if (selectedStatus !== "all" && ticket.status !== selectedStatus) {
        return false;
      }

      if (selectedType !== "all" && ticket.type !== selectedType) {
        return false;
      }

      if (startDate) {
        const ticketDate = ticket.createdAt ? new Date(ticket.createdAt) : null;
        const filterStartDate = parseISO(startDate);
        if (ticketDate && isBefore(ticketDate, filterStartDate)) {
          return false;
        }
      }

      if (endDate) {
        const ticketDate = ticket.createdAt ? new Date(ticket.createdAt) : null;
        const filterEndDate = parseISO(endDate);
        if (ticketDate && isAfter(ticketDate, filterEndDate)) {
          return false;
        }
      }

      return true;
    });
  }, [
    tickets,
    searchQuery,
    selectedAssignee,
    selectedPriority,
    selectedStatus,
    selectedType,
    startDate,
    endDate,
  ]);

  if (isLoading) {
    return (
      <div className="p-8 h-full flex flex-col space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return notFound();

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedAssignee("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
    setSelectedType("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    searchQuery ||
    selectedAssignee !== "all" ||
    selectedPriority !== "all" ||
    selectedStatus !== "all" ||
    selectedType !== "all" ||
    startDate ||
    endDate;

  const activeFilterCount = [
    searchQuery,
    selectedAssignee !== "all" ? selectedAssignee : "",
    selectedPriority !== "all" ? selectedPriority : "",
    selectedStatus !== "all" ? selectedStatus : "",
    selectedType !== "all" ? selectedType : "",
    startDate,
    endDate,
  ].filter(Boolean).length;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 pt-4 md:pt-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Backlog</h1>
          <p className="text-muted-foreground">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in backlog
          </p>
        </div>
        <div className="flex justify-center w-full md:w-auto md:justify-end">
          <CreateTicketDialog projectId={projectId} />
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all ({activeFilterCount})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
            <SelectTrigger>
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {uniqueAssignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger>
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="STORY">Story</SelectItem>
              <SelectItem value="EPIC">Epic</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="From date"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="To date"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredTickets.length} of {tickets.length} tickets
            </span>
          </div>
        )}
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
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center h-24 text-muted-foreground"
                >
                  {hasActiveFilters
                    ? "No tickets match your filters. Try adjusting your search criteria."
                    : "No tickets found. Create one to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">#{ticket.ticketNumber}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate">{ticket.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ticket.type === "BUG" ? "destructive" : "secondary"
                      }
                    >
                      {ticket.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.priority && (
                      <Badge
                        variant={
                          ticket.priority === "URGENT" ||
                          ticket.priority === "HIGH"
                            ? "destructive"
                            : ticket.priority === "MEDIUM"
                            ? "default"
                            : "secondary"
                        }
                      >
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
                      <span className="text-muted-foreground text-sm">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ticket.createdAt
                      ? format(new Date(ticket.createdAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
