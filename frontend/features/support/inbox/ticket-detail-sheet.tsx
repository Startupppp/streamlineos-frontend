"use client";

import { useState, useCallback, useRef } from "react";
import { useSupportTicket, useAddSupportMessage, useUpdateSupportTicket } from "@/hooks/api/support";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Send,
  Lock,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  BookOpen,
  ExternalLink,
  FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getInitials } from "@/lib/format-utils";
import { SupportActivityLog } from "@/components/support/support-activity-log";
import type { SupportTicketStatus } from "@/types/support";
import { useKbSearch, useKbSpaces } from "@/hooks/api/kb";
import { useCreateKbArticleFromTicket } from "@/hooks/api/kb/from-ticket";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface PendingAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
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

interface KbDeflectionPanelProps {
  ticketId: number;
  ticketTitle: string;
}

function KbDeflectionPanel({ ticketId, ticketTitle }: KbDeflectionPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");

  const { data: searchData, isLoading: searchLoading } = useKbSearch(
    { q: ticketTitle, pageSize: 4 },
    { enabled: open },
  );
  const { data: spaces } = useKbSpaces();
  const { mutate: createMutate, isPending: createPending } = useCreateKbArticleFromTicket();

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleSpaceChange = useCallback((v: string) => setSelectedSpaceId(v), []);

  const handleCreate = useCallback(() => {
    if (!selectedSpaceId) return;
    createMutate(
      { ticketId, spaceId: Number(selectedSpaceId) },
      {
        onSuccess: (article) => {
          toast.success("Draft article created");
          window.open(
            `/knowledge/spaces/${article.spaceId}/articles/${article.id}`,
            "_blank",
            "noopener,noreferrer",
          );
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create article");
        },
      },
    );
  }, [selectedSpaceId, ticketId, createMutate]);

  const articles = searchData?.items ?? [];

  return (
    <div className="px-4 py-2 border-t border-border/40 shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 w-full text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        KB Deflection
        <ChevronDown
          className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Related articles</p>
            {searchLoading ? (
              <div className="space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse w-3/4" />
                ))}
              </div>
            ) : articles.length > 0 ? (
              <ul className="space-y-1">
                {articles.map((article) => (
                  <li key={article.id}>
                    <a
                      href={`/knowledge/spaces/${article.spaceId}/articles/${article.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 min-w-0 text-[12px] text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{article.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedSpaceId}
              onValueChange={handleSpaceChange}
              disabled={!spaces?.length}
            >
              <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                <SelectValue placeholder="Select space" />
              </SelectTrigger>
              <SelectContent>
                {(spaces ?? []).map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs shrink-0 whitespace-nowrap"
              disabled={!selectedSpaceId || createPending || !spaces?.length}
              onClick={handleCreate}
            >
              {createPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <FilePlus className="h-3.5 w-3.5 mr-1" />
              )}
              Create KB article
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TicketDetailSheetProps {
  ticketId: number;
  onBack: () => void;
}

export function TicketDetailSheet({ ticketId, onBack }: TicketDetailSheetProps) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addMessage = useAddSupportMessage();
  const updateTicket = useUpdateSupportTicket();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const json = await apiClient.upload<{ url: string }>("/storage/upload", fd);
          uploaded.push({
            fileName: file.name,
            fileUrl: json.url,
            fileSize: file.size,
            mimeType: file.type,
          });
        }
        setPendingFiles((prev) => [...prev, ...uploaded]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "File upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    []
  );

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

  const handleStatusChange = useCallback(
    (status: SupportTicketStatus) => {
      if (!ticket) return;
      updateTicket.mutate(
        { id: ticket.id, status },
        { onSuccess: () => toast.success("Status updated") }
      );
    },
    [ticket, updateTicket]
  );

  const handleStatusValueChange = useCallback(
    (v: string) => handleStatusChange(v as SupportTicketStatus),
    [handleStatusChange]
  );

  const handleToggleInternal = useCallback(() => setIsInternal((v) => !v), []);

  const handleReplyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value),
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isPlainEnter = e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey;
      const isModifierEnter = e.key === "Enter" && (e.metaKey || e.ctrlKey);
      if (isPlainEnter || isModifierEnter) {
        e.preventDefault();
        handleReply();
      }
    },
    [handleReply]
  );

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBreached =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    !["RESOLVED", "CLOSED"].includes(ticket.status);

  const messages = ticket.messages ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="md:hidden h-7 px-2 shrink-0"
            >
              Back
            </Button>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{toTitleCase(ticket.title)}</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[ticket.priority])}>
              {ticket.priority}
            </Badge>
            {isBreached && (
              <Badge variant="destructive" className="text-xs">
                SLA Breached
              </Badge>
            )}
            <Select value={ticket.status} onValueChange={handleStatusValueChange}>
              <SelectTrigger className="h-7 text-xs w-[120px]">
                <SelectValue />
              </SelectTrigger>
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
          <div className="bg-muted/30 rounded-lg p-3 mb-4 text-sm">
            {toSentenceCase(ticket.description)}
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => {
            const isInternalMsg = msg.isInternal;
            const attachments = (msg.attachments ?? []) as {
              fileName: string;
              fileUrl: string;
              fileSize: number;
              mimeType: string;
            }[];
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
                  <AvatarFallback className="text-[9px]">
                    {getInitials(msg.author?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{msg.author?.name}</span>
                    {isInternalMsg && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 gap-0.5 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400"
                      >
                        <Lock className="h-2.5 w-2.5" /> Internal Note
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {msg.createdAt
                        ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })
                        : ""}
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

        <div className="mt-5 pt-4 border-t border-border/40">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Activity
          </h4>
          <SupportActivityLog supportTicketId={ticket.id} />
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Switch
            checked={isInternal}
            onCheckedChange={handleToggleInternal}
            className="h-4 w-7"
          />
          <Label
            className="text-[11px] text-muted-foreground cursor-pointer"
            onClick={handleToggleInternal}
          >
            {isInternal ? "Internal note (not visible to client)" : "Public reply"}
          </Label>
        </div>
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pendingFiles.map((f, i) => {
              const Icon = fileMimeIcon(f.mimeType);
              return (
                <div
                  key={i}
                  className="flex items-center gap-1 text-[11px] bg-muted rounded px-2 py-0.5 border"
                >
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
            className={cn(
              "min-h-[60px] max-h-[120px] text-sm resize-none",
              isInternal &&
                "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40"
            )}
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
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              onClick={handleReply}
              disabled={(!replyText.trim() && pendingFiles.length === 0) || addMessage.isPending}
              size="icon"
              className="h-[28px] w-10 shrink-0"
              aria-label="Send reply"
            >
              {addMessage.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
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

      <KbDeflectionPanel ticketId={ticket.id} ticketTitle={ticket.title} />
    </div>
  );
}
