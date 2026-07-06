"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAddSupportMessage } from "@/hooks/api/support";
import {
  SUPPORT_FOCUS_REPLY_EVENT,
  type SupportFocusReplyDetail,
} from "./use-inbox-shortcuts";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface PendingAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

interface TicketReplyComposerProps {
  ticketId: number;
}

export function TicketReplyComposer({ ticketId }: TicketReplyComposerProps) {
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useAddSupportMessage();

  useEffect(() => {
    function handleFocusReply(e: Event) {
      const detail = (e as CustomEvent<SupportFocusReplyDetail>).detail;
      setIsInternal(detail?.internal ?? false);
      textareaRef.current?.focus();
    }
    window.addEventListener(SUPPORT_FOCUS_REPLY_EVENT, handleFocusReply);
    return () => window.removeEventListener(SUPPORT_FOCUS_REPLY_EVENT, handleFocusReply);
  }, []);

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
      },
    );
  }, [replyText, ticketId, isInternal, pendingFiles, addMessage]);

  const handleToggleInternal = useCallback(() => setIsInternal((v) => !v), []);

  const handleReplyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value),
    [],
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
    [handleReply],
  );

  return (
    <div className="px-4 py-3 border-t border-border/40 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Switch checked={isInternal} onCheckedChange={handleToggleInternal} className="h-4 w-7" />
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
          ref={textareaRef}
          value={replyText}
          onChange={handleReplyChange}
          placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
          className={cn(
            "min-h-[60px] max-h-[120px] text-sm resize-none",
            isInternal && "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/40",
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
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
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
  );
}
