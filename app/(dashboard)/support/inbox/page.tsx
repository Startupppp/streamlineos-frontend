"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import type { SupportTicketStatus, SupportTicketPriority, SupportTicket } from "@/types/support";

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

const TITLE_INVALID_CHARS = /[<>{}|\\^`]/;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

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

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

export default function SupportInboxPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "CUSTOMER_SUPPORT"]}>
      <InboxContent />
    </DashboardGate>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";
  const priorityFilter = searchParams.get("priority") || "all";

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router, pathname]);

  const { data: ticketsData, isLoading } = useSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as SupportTicketPriority } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleStatusFilter = useCallback((v: string) => updateFilter("status", v), [updateFilter]);
  const handlePriorityFilter = useCallback((v: string) => updateFilter("priority", v), [updateFilter]);
  const handleBackFromTicket = useCallback(() => setSelectedTicketId(null), []);

  return (
    <>
      <PageWrapper
        title="Support Inbox"
        subtitle={
          statsLoading
            ? "Loading..."
            : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets${(stats?.sla_breached ?? 0) > 0 ? ` · ${stats?.sla_breached} SLA breached` : ""}`
        }
        actions={
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Button>
        }
        filters={
          <>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
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
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        noInternalScroll
        contentClassName="flex overflow-hidden !py-0 !px-0"
      >
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
                {tickets.map((ticket) => (
                  <TicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicketId === ticket.id}
                    onSelect={setSelectedTicketId}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetail ticketId={selectedTicketId} onBack={handleBackFromTicket} />
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
      </PageWrapper>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

interface TicketListItemProps {
  ticket: SupportTicket;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function TicketListItem({ ticket, isSelected, onSelect }: TicketListItemProps) {
  const handleClick = useCallback(() => onSelect(ticket.id), [ticket.id, onSelect]);
  const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
        isSelected && "bg-muted/50 border-l-2 border-blue-500"
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
}

interface PendingAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

function TicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addMessage = useAddSupportMessage();
  const updateTicket = useUpdateSupportTicket();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE);
    if (oversized) {
      toast.error(`${oversized.name} exceeds 10MB limit`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const uploaded: PendingAttachment[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "support-attachments");
        const res = await fetch("/api/storage/upload", { method: "POST", body: fd });
        const json = await res.json() as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
        uploaded.push({ fileName: file.name, fileUrl: json.url, fileSize: file.size, mimeType: file.type });
      }
      setPendingFiles((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAttachClick = useCallback(() => fileRef.current?.click(), []);

  const handleReply = useCallback(() => {
    if (!replyText.trim() && pendingFiles.length === 0) return;
    addMessage.mutate(
      { ticketId, body: replyText || "(attachment)", isInternal, attachments: pendingFiles },
      {
        onSuccess: () => {
          setReplyText("");
          setPendingFiles([]);
          toast.success("Reply sent");
        },
      }
    );
  }, [replyText, ticketId, isInternal, pendingFiles, addMessage]);

  const handleStatusChange = useCallback((status: SupportTicketStatus) => {
    if (!ticket) return;
    updateTicket.mutate(
      { id: ticket.id, status },
      { onSuccess: () => toast.success("Status updated") }
    );
  }, [ticket, updateTicket]);

  const handleStatusValueChange = useCallback((v: string) => handleStatusChange(v as SupportTicketStatus), [handleStatusChange]);
  const handleToggleInternal = useCallback(() => setIsInternal((v) => !v), []);
  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value), []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  }, [handleReply]);

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
            <Select value={ticket.status} onValueChange={handleStatusValueChange}>
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
          {messages.map((msg) => {
            const isInternalMsg = msg.isInternal;
            const attachments = (msg.attachments ?? []) as { fileName: string; fileUrl: string; fileSize: number; mimeType: string }[];
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5 rounded-lg p-3",
                  isInternalMsg
                    ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40"
                    : "bg-muted/20"
                )}
              >
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={resolveImageUrl(msg.author?.image)} />
                  <AvatarFallback className="text-[9px]">{getInitials(msg.author?.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{msg.author?.name}</span>
                    {isInternalMsg && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400">
                        <Lock className="h-2.5 w-2.5" /> Internal Note
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                    </span>
                  </div>
                  {msg.body && msg.body !== "(attachment)" && (
                    <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{msg.body}</p>
                  )}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {attachments.map((att, i) => {
                        const Icon = fileMimeIcon(att.mimeType);
                        return (
                          <a
                            key={i}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline bg-blue-50 dark:bg-blue-950/20 rounded px-2 py-0.5 border border-blue-200 dark:border-blue-800"
                          >
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{att.fileName}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Switch checked={isInternal} onCheckedChange={handleToggleInternal} className="h-4 w-7" />
          <Label className="text-[11px] text-muted-foreground cursor-pointer" onClick={handleToggleInternal}>
            {isInternal ? "Internal note (not visible to client)" : "Public reply"}
          </Label>
        </div>
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pendingFiles.map((f, i) => {
              const Icon = fileMimeIcon(f.mimeType);
              return (
                <div key={i} className="flex items-center gap-1 text-[11px] bg-muted rounded px-2 py-0.5 border">
                  <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[100px]">{f.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${f.fileName}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={handleReplyChange}
            placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
            className={cn("min-h-[60px] max-h-[120px] text-sm resize-none", isInternal && "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40")}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-[28px] w-10 shrink-0"
              onClick={handleAttachClick}
              disabled={uploading}
              aria-label="Attach file"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            </Button>
            <Button
              onClick={handleReply}
              disabled={(!replyText.trim() && pendingFiles.length === 0) || addMessage.isPending}
              size="icon"
              className="h-[28px] w-10 shrink-0"
              aria-label="Send reply"
            >
              {addMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileSelect}
          aria-label="Attach files"
        />
      </div>
    </div>
  );
}

const TICKET_CATEGORIES = ["Technical Issue", "Billing", "Feature Request", "Account", "Performance", "Integration", "Other"] as const;
type TicketCategory = (typeof TICKET_CATEGORIES)[number];

function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Title is required";
  if (trimmed.length < 5) return "Title must be at least 5 characters";
  if (trimmed.length > 150) return "Title must be at most 150 characters";
  if (/\s{2,}/.test(trimmed)) return "Title cannot have multiple consecutive spaces";
  if (/^[\W\s]+$/.test(trimmed)) return "Title cannot consist of only special characters";
  if (!/[a-zA-Z0-9]/.test(trimmed)) return "Title must contain at least one letter or number";
  if (TITLE_INVALID_CHARS.test(trimmed)) return "Title contains invalid characters (<>{}|\\^`)";
  return null;
}

function CreateTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("MEDIUM");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const create = useCreateSupportTicket();

  const resetForm = useCallback(() => {
    setTitle("");
    setTitleError(null);
    setDescription("");
    setPriority("MEDIUM");
    setCategory("");
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setTitleError(null);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setTitleError(validateTitle(title));
  }, [title]);

  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handlePriorityChange = useCallback((v: string) => setPriority(v as SupportTicketPriority), []);
  const handleCategoryChange = useCallback((v: string) => setCategory(v as TicketCategory), []);
  const handleCancel = useCallback(() => { resetForm(); onOpenChange(false); }, [resetForm, onOpenChange]);

  const handleCreate = useCallback(() => {
    const titleErr = validateTitle(title);
    if (titleErr) { setTitleError(titleErr); return; }
    if (!category) { toast.error("Please select a category"); return; }

    create.mutate(
      { title: title.trim(), category: category || undefined, description: description.trim() || undefined, priority },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
          toast.success("Ticket created");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create ticket"),
      }
    );
  }, [create, title, description, priority, category, onOpenChange, resetForm]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Brief description of the issue"
              className={cn("mt-1", titleError && "border-destructive")}
              maxLength={150}
            />
            {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{title.trim().length}/150 characters</p>
          </div>
          <div>
            <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={handleDescChange}
              placeholder="Detailed description..."
              className="mt-1 min-h-[80px]"
              maxLength={5000}
            />
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={priority} onValueChange={handlePriorityChange}>
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
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
