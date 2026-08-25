"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useReplyToPortalTicket } from "@/hooks/api/support/portal";
import type { SupportMessageAttachment } from "@/types/support";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

interface PortalReplyComposerProps {
  ticketId: number;
}

export function PortalReplyComposer({ ticketId }: PortalReplyComposerProps) {
  const [replyText, setReplyText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<SupportMessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reply = useReplyToPortalTicket(ticketId);

  const handleAttachClick = useCallback(() => fileRef.current?.click(), []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      if (pendingFiles.length + files.length > MAX_ATTACHMENTS) {
        toast.error(`You can attach up to ${MAX_ATTACHMENTS} files`);
        e.target.value = "";
        return;
      }

      const oversized = files.find((f) => f.size > MAX_ATTACHMENT_SIZE);
      if (oversized) {
        toast.error(`${oversized.name} exceeds 10MB limit`);
        e.target.value = "";
        return;
      }

      setUploading(true);
      try {
        const uploaded: SupportMessageAttachment[] = [];
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
        toast.error(getErrorMessage(err));
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [pendingFiles.length],
  );

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleReplyChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value),
    [],
  );

  const handleReply = useCallback(() => {
    if (!replyText.trim()) return;
    reply.mutate(
      { body: replyText.trim(), attachments: pendingFiles.length > 0 ? pendingFiles : undefined },
      {
        onSuccess: () => {
          setReplyText("");
          setPendingFiles([]);
          toast.success("Reply sent");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [replyText, pendingFiles, reply]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isModifierEnter = e.key === "Enter" && (e.metaKey || e.ctrlKey);
      if (isModifierEnter) {
        e.preventDefault();
        handleReply();
      }
    },
    [handleReply],
  );

  return (
    <div className="px-4 py-3 border-t border-border/40 shrink-0">
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pendingFiles.map((f, i) => {
            const Icon = fileMimeIcon(f.mimeType);
            return (
              <div key={i} className="flex items-center gap-1 text-dense bg-muted rounded px-2 py-0.5 border">
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
          placeholder="Type your reply..."
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          maxLength={5000}
          onKeyDown={handleKeyDown}
        />
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-[28px] w-10 shrink-0"
            onClick={handleAttachClick}
            disabled={uploading || pendingFiles.length >= MAX_ATTACHMENTS}
            aria-label="Attach file"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          </Button>
          <LoadingButton
            onClick={handleReply}
            disabled={!replyText.trim()}
            isPending={reply.isPending}
            size="icon"
            className="h-[28px] w-10 shrink-0"
            aria-label="Send reply"
          >
            <Send className="h-3.5 w-3.5" />
          </LoadingButton>
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
