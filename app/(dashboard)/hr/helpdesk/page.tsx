"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { useHrHelpdeskTickets, useCreateHelpdeskTicket } from "@/lib/api/hooks/hr";
import { AISuggestReplyButton } from "@/features/hr/helpdesk/ai-suggest-reply-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea as SheetScrollArea } from "@/components/ui/scroll-area";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Ticket, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatDistanceToNow, format } from "date-fns";
import type { TicketPriority, TicketStatus, HelpdeskTicket } from "@/types/hr";

const STATUS_OPTIONS: { value: TicketStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const CATEGORY_OPTIONS = [
  "IT Support",
  "HR Query",
  "Facilities",
  "Finance",
  "Access Request",
  "Equipment",
  "Other",
];


function TicketDetailSheet({
  ticket,
  onClose,
}: {
  ticket: HelpdeskTicket | null;
  onClose: () => void;
}) {
  if (!ticket) return null;
  return (
    <Sheet open={!!ticket} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-base leading-snug pr-6">{ticket.title}</SheetTitle>
          <SheetDescription className="text-xs">Ticket #{ticket.id} · Created {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : "—"}</SheetDescription>
        </SheetHeader>
        <SheetScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                <StatusBadge status={ticket.status ?? "TODO"} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                <StatusBadge status={ticket.priority ?? "MEDIUM"} type="priority" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                <p className="text-sm">{ticket.category ?? "—"}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Assigned To</p>
                <p className="text-sm">{ticket.assigneeId ? `ID: ${ticket.assigneeId}` : "Unassigned"}</p>
              </div>
              {ticket.createdAt && (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Created</p>
                  <p className="text-sm">{format(new Date(ticket.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Resolved</p>
                  <p className="text-sm">{format(new Date(ticket.resolvedAt), "MMM d, yyyy 'at' HH:mm")}</p>
                </div>
              )}
            </div>
            {ticket.description && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-muted/50 p-3 border">
                  {ticket.description}
                </p>
              </div>
            )}
            {ticket.resolution && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Resolution</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-lg bg-emerald-500/5 border-emerald-500/20 border p-3">
                  {ticket.resolution}
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ticket Routing</p>
              <p className="text-xs text-muted-foreground">
                {ticket.assigneeId
                  ? "This ticket has been assigned to a support agent."
                  : "This ticket is in the queue and will be assigned to a support agent based on category and availability."}
              </p>
            </div>
          </div>
        </SheetScrollArea>
        <SheetFooter className="shrink-0 px-5 py-4 border-t">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function HelpdeskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get("status") as TicketStatus | null) ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";

  const { data: tickets, isLoading } = useHrHelpdeskTickets(undefined, statusFilter);
  const createTicket = useCreateHelpdeskTicket();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, inProgress: 0, resolved: 0 };
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "TODO").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW").length,
      resolved: tickets.filter((t) => t.status === "DONE").length,
    };
  }, [tickets]);

  const handleCreateTicket = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Ticket title is required"); return; }
    if (trimmedTitle.length < 5) { toast.error("Ticket title must be at least 5 characters"); return; }
    if (trimmedTitle.length > 150) { toast.error("Ticket title must be at most 150 characters"); return; }
    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) { toast.error("Ticket title must contain at least one letter or digit"); return; }
    if (/^[^a-zA-Z0-9]+$/.test(trimmedTitle)) { toast.error("Ticket title cannot consist of only special characters"); return; }
    if (/\s{2,}/.test(title)) { toast.error("Ticket title cannot have multiple consecutive spaces"); return; }
    if (title !== trimmedTitle) { toast.error("Ticket title cannot have leading or trailing spaces"); return; }
    if (!category) { toast.error("Please select a category"); return; }
    createTicket.mutate(
      { title: trimmedTitle, description: description.trim() || undefined, category, priority },
      {
        onSuccess: () => {
          toast.success("Ticket created successfully");
          setSheetOpen(false);
          setTitle("");
          setDescription("");
          setCategory("");
          setPriority("MEDIUM");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  }, [title, description, category, priority, createTicket]);

  if (isLoading) {
    return (
      <PageWrapper title="Helpdesk" subtitle="Submit and track your support tickets">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper
      title="Helpdesk"
      subtitle="Submit and track your support tickets"
      badge={`${stats.total} tickets`}
      actions={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Create Support Ticket</SheetTitle>
              <SheetDescription className="text-xs">Describe your issue and we&apos;ll get back to you.</SheetDescription>
            </SheetHeader>
            <SheetScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Brief description of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Provide more details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="resize-none w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Category <span className="text-destructive">*</span></label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SheetScrollArea>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setTitle(""); setDescription(""); setCategory(""); setPriority("MEDIUM"); setSheetOpen(false);
              }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateTicket} disabled={createTicket.isPending}>
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
      filters={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setFilter("q", e.target.value || null)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select
            value={statusFilter ?? "ALL"}
            onValueChange={(v) => setFilter("status", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} icon={Ticket} color="blue" index={0} />
          <StatCard label="Open" value={stats.open} icon={AlertCircle} color="amber" index={1} />
          <StatCard label="In Progress" value={stats.inProgress} icon={Clock} color="cyan" index={2} />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} color="green" index={3} />
        </div>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>AI</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <EmptyTicketIllustration className="h-36 w-36 opacity-95" />
                            <p>{searchQuery ? "No tickets match your search." : "No tickets yet. Create your first one!"}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} className="group">
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.title}</p>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{ticket.category ?? "—"}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.priority ?? "MEDIUM"} type="priority" />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status ?? "TODO"} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ticket.createdAt
                              ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <AISuggestReplyButton ticketId={ticket.id} compact />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedTicket(ticket)}
                              aria-label="View ticket details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
    <TicketDetailSheet ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </>
  );
}
