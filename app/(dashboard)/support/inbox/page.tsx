"use client";

import { useState } from "react";
import {
  useSupportTickets,
  useSupportTicket,
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useAddSupportMessage,
  useSupportStats,
} from "@/lib/api/hooks/support";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Send,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyInboxIllustration, EmptyTicketIllustration } from "@/components/illustrations";
import type { SupportTicketStatus, SupportTicketPriority } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  OPEN: AlertTriangle,
  IN_PROGRESS: Clock,
  WAITING: Pause,
  RESOLVED: CheckCircle2,
  CLOSED: CheckCircle2,
};

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentenceCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function SupportInboxPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "CUSTOMER_SUPPORT"]}>
      <InboxContent />
    </DashboardGate>
  );
}

function InboxContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: ticketsData, isLoading } = useSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as SupportTicketPriority } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-border/40 shrink-0 sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">Support Inbox</h2>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "Loading..." : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets`}
              {(stats?.sla_breached ?? 0) > 0 && (
                <span className="text-red-500 font-medium ml-2">{stats?.sla_breached} SLA breached</span>
              )}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn("w-full md:w-[360px] border-r border-border/40 flex flex-col overflow-hidden", selectedTicketId && "hidden md:flex")}>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 px-4">
                <EmptyInboxIllustration className="mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No tickets found</p>
                <p className="text-xs text-muted-foreground mt-1">New tickets will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {tickets.map((ticket) => {
                  const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
                  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);
                  return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
                        selectedTicketId === ticket.id && "bg-muted/50 border-l-2 border-[#bd882c]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate">{toTitleCase(ticket.title)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", PRIORITY_COLORS[ticket.priority])}>
                            {ticket.priority}
                          </Badge>
                          {isBreached && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">SLA</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{ticket.status.replace("_", " ")}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <EmptyTicketIllustration className="mx-auto mb-3 w-40 h-40" />
                <p className="text-sm font-medium text-foreground">Select a ticket</p>
                <p className="text-xs text-muted-foreground mt-1">Choose a ticket from the list to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const addMessage = useAddSupportMessage();
  const updateTicket = useUpdateSupportTicket();

  const handleReply = () => {
    if (!replyText.trim()) return;
    addMessage.mutate(
      { ticketId, body: replyText, isInternal },
      {
        onSuccess: () => {
          setReplyText("");
          toast.success("Reply sent");
        },
      }
    );
  };

  const handleStatusChange = (status: SupportTicketStatus) => {
    if (!ticket) return;
    updateTicket.mutate(
      { id: ticket.id, status },
      { onSuccess: () => toast.success("Status updated") }
    );
  };

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);
  const messages = [...(ticket.messages ?? [])].reverse();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden h-7 px-2">Back</Button>
            <div>
              <h3 className="text-sm font-bold">{toTitleCase(ticket.title)}</h3>
              <p className="text-[11px] text-muted-foreground">#{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</Badge>
            {isBreached && <Badge variant="destructive" className="text-xs">SLA Breached</Badge>}
            <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as SupportTicketStatus)}>
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {ticket.description && (
          <div className="bg-muted/30 rounded-lg p-3 mb-4 text-sm">{toSentenceCase(ticket.description)}</div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.isInternal && "opacity-70")}>
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={resolveImageUrl(msg.author?.image)} />
                <AvatarFallback className="text-[9px]">{getInitials(msg.author?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{msg.author?.name}</span>
                  {msg.isInternal && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-amber-300 text-amber-600">
                      <Lock className="h-2.5 w-2.5" /> Internal
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                  </span>
                </div>
                <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Switch checked={isInternal} onCheckedChange={setIsInternal} className="h-4 w-7" />
          <Label className="text-[11px] text-muted-foreground cursor-pointer" onClick={() => setIsInternal(!isInternal)}>
            {isInternal ? "Internal note (not visible to client)" : "Public reply"}
          </Label>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
            className="min-h-[60px] max-h-[120px] text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
          />
          <Button
            onClick={handleReply}
            disabled={!replyText.trim() || addMessage.isPending}
            size="icon"
            className="h-[60px] w-10 shrink-0 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white"
          >
            {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("MEDIUM");
  const create = useCreateSupportTicket();

  const handleCreate = () => {
    create.mutate(
      { title, description, priority },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setDescription("");
          setPriority("MEDIUM");
          toast.success("Ticket created");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description of the issue" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description..." className="mt-1 min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicketPriority)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low (48h SLA)</SelectItem>
                <SelectItem value="MEDIUM">Medium (24h SLA)</SelectItem>
                <SelectItem value="HIGH">High (8h SLA)</SelectItem>
                <SelectItem value="URGENT">Urgent (2h SLA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || create.isPending} className="bg-[#bd882c] hover:bg-[#bd882c]/90 text-white">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
