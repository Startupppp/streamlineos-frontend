"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { useHrHelpdeskTickets, useCreateHelpdeskTicket } from "@/hooks/api/hr";
import { AISuggestReplyButton } from "@/features/hr/helpdesk/ai-suggest-reply-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Plus,
  Search,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
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

const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters")
    .refine((v) => v === v.trim(), "Title cannot have leading or trailing spaces")
    .refine((v) => !/\s{2,}/.test(v), "Title cannot have consecutive spaces")
    .refine((v) => /[a-zA-Z0-9]/.test(v), "Title must contain at least one letter or digit")
    .refine(
      (v) => !/^[^a-zA-Z0-9]+$/.test(v),
      "Title cannot consist only of special characters",
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be at most 1000 characters"),
  category: z.string().min(1, "Please select a category"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

function isTicketStatus(value: string | null): value is TicketStatus {
  return (
    value === "TODO" ||
    value === "IN_PROGRESS" ||
    value === "IN_REVIEW" ||
    value === "DONE"
  );
}

function getTicketInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "URGENT":
    case "HIGH":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "DONE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800";
    case "IN_PROGRESS":
    case "IN_REVIEW":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800";
  }
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "URGENT": return "Urgent";
    case "HIGH": return "High";
    case "MEDIUM": return "Medium";
    default: return "Low";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "DONE": return "Done";
    case "IN_PROGRESS": return "In Progress";
    case "IN_REVIEW": return "In Review";
    default: return "To Do";
  }
}

interface TicketTableRowProps {
  ticket: HelpdeskTicket;
  onView: (ticket: HelpdeskTicket) => void;
}

function TicketTableRow({ ticket, onView }: TicketTableRowProps) {
  const handleView = useCallback(() => onView(ticket), [ticket, onView]);

  return (
    <TableRow className="group hover:bg-muted/30 transition-colors duration-200">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">
              {getTicketInitials(ticket.title)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {ticket.title}
            </p>
            {ticket.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                {ticket.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{ticket.category ?? "—"}</span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            getPriorityBadgeClass(ticket.priority ?? "MEDIUM"),
          )}
        >
          {getPriorityLabel(ticket.priority ?? "MEDIUM")}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            getStatusBadgeClass(ticket.status ?? "TODO"),
          )}
        >
          {getStatusLabel(ticket.status ?? "TODO")}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground">
          {ticket.createdAt
            ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
            : "—"}
        </span>
      </TableCell>
      <TableCell>
        <AISuggestReplyButton ticketId={ticket.id} compact />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={handleView}
          aria-label="View ticket details"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function TicketDetailSheet({
  ticket,
  onClose,
}: {
  ticket: HelpdeskTicket | null;
  onClose: () => void;
}) {
  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  if (!ticket) return null;

  return (
    <Sheet open={!!ticket} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col p-0 gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-base font-semibold leading-snug pr-6">
            {ticket.title}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Ticket #{ticket.id} · Created{" "}
            {ticket.createdAt
              ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
              : "—"}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </p>
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    getStatusBadgeClass(ticket.status ?? "TODO"),
                  )}
                >
                  {getStatusLabel(ticket.status ?? "TODO")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Priority
                </p>
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    getPriorityBadgeClass(ticket.priority ?? "MEDIUM"),
                  )}
                >
                  {getPriorityLabel(ticket.priority ?? "MEDIUM")}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </p>
                <p className="text-sm text-foreground">{ticket.category ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned To
                </p>
                <p className="text-sm text-foreground">
                  {ticket.assigneeId ? `ID: ${ticket.assigneeId}` : "Unassigned"}
                </p>
              </div>
              {ticket.createdAt && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Created
                  </p>
                  <p className="text-sm text-foreground">
                    {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Resolved
                  </p>
                  <p className="text-sm text-foreground">
                    {format(new Date(ticket.resolvedAt), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              )}
            </div>

            {ticket.description && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/50 p-3 border border-border">
                  {ticket.description}
                </p>
              </div>
            )}

            {ticket.resolution && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Resolution
                </p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                  {ticket.resolution}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Ticket Routing
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.assigneeId
                  ? "This ticket has been assigned to a support agent."
                  : "This ticket is in the queue and will be assigned to a support agent based on category and availability."}
              </p>
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="shrink-0 px-5 py-4 border-t">
          <Button
            variant="outline"
            className="w-full h-9 transition-colors duration-200"
            onClick={onClose}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function HelpdeskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = searchParams.get("status");
  const statusFilter = isTicketStatus(rawStatus) ? rawStatus : undefined;
  const searchQuery = searchParams.get("q") ?? "";

  const { data: tickets, isLoading, isError, refetch } = useHrHelpdeskTickets(
    undefined,
    statusFilter,
  );
  const createTicket = useCreateHelpdeskTicket();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { title: "", description: "", category: "", priority: "MEDIUM" },
  });

  const descriptionValue = form.watch("description");

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
    [searchParams, router],
  );

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }, [tickets, searchQuery]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, inProgress: 0, resolved: 0 };
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "TODO").length,
      inProgress: tickets.filter(
        (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW",
      ).length,
      resolved: tickets.filter((t) => t.status === "DONE").length,
    };
  }, [tickets]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      setSheetOpen(open);
    },
    [form],
  );

  const handleCreateTicket = useCallback(
    (data: CreateTicketFormData) => {
      createTicket.mutate(data, {
        onSuccess: () => {
          toast.success("Ticket created successfully");
          setSheetOpen(false);
          form.reset();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [createTicket, form],
  );

  const handleSubmitForm = useCallback(() => {
    void form.handleSubmit(handleCreateTicket)();
  }, [form, handleCreateTicket]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFilter("q", e.target.value || null),
    [setFilter],
  );

  const handleStatusFilterChange = useCallback(
    (v: string) => setFilter("status", v),
    [setFilter],
  );

  const handleViewTicket = useCallback((ticket: HelpdeskTicket) => {
    setSelectedTicket(ticket);
  }, []);

  const handleCloseTicketDetail = useCallback(() => {
    setSelectedTicket(null);
  }, []);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Helpdesk" subtitle="Submit and track your support tickets">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card shadow-sm p-4">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Helpdesk" subtitle="Submit and track your support tickets">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Failed to load tickets</p>
            <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
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
          <Button size="sm" className="h-8 gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            New Ticket
          </Button>
        }
        filters={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 h-8 text-xs w-48"
              />
            </div>
            <Select value={statusFilter ?? "ALL"} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} icon={Ticket} color="blue" index={0} />
            <StatCard label="Open" value={stats.open} icon={AlertCircle} color="amber" index={1} />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              icon={Clock}
              color="cyan"
              index={2}
            />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="green"
              index={3}
            />
          </div>

          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="w-full" type="auto">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="font-semibold text-foreground/80">Subject</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Category</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Priority</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                        <TableHead className="font-semibold text-foreground/80">Created</TableHead>
                        <TableHead className="font-semibold text-foreground/80">AI</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <EmptyTicketIllustration className="h-36 w-36 opacity-95" />
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {searchQuery
                                    ? "No tickets match your search"
                                    : "No tickets yet"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {searchQuery
                                    ? "Try adjusting your search or filters."
                                    : "Create your first support ticket to get started."}
                                </p>
                              </div>
                              {!searchQuery && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 mt-1"
                                  onClick={handleOpenSheet}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  New Ticket
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <TicketTableRow
                            key={ticket.id}
                            ticket={ticket}
                            onView={handleViewTicket}
                          />
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

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Support Ticket"
        description="Describe your issue and we'll get back to you."
        onSubmit={handleSubmitForm}
        submitLabel={createTicket.isPending ? "Creating..." : "Create Ticket"}
        isPending={createTicket.isPending}
      >
        <Form {...form}>
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the issue"
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide more details..."
                      rows={4}
                      maxLength={1000}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <p className="text-[11px] text-muted-foreground ml-auto shrink-0">
                      {descriptionValue.length}/1000
                    </p>
                  </div>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Category <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </HrSheet>

      <TicketDetailSheet ticket={selectedTicket} onClose={handleCloseTicketDetail} />
    </>
  );
}
