"use client";

import { useState, useCallback, useRef } from "react";
import { useCreateSupportTicket, useAddSupportMessage } from "@/hooks/api/support";
import { Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import type { SupportTicketPriority } from "@/types/support";

const TICKET_CATEGORIES = [
  "Technical Issue",
  "Billing",
  "Feature Request",
  "Account",
  "Performance",
  "Integration",
  "Other",
] as const;

type TicketCategory = (typeof TICKET_CATEGORIES)[number];

const TITLE_INVALID_CHARS = /[<>{}|\\^`]/;
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

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("MEDIUM");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const create = useCreateSupportTicket();
  const addMessage = useAddSupportMessage();

  const resetForm = useCallback(() => {
    setTitle("");
    setTitleError(null);
    setDescription("");
    setPriority("MEDIUM");
    setCategory("");
    setPendingFiles([]);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setTitleError(null);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setTitleError(validateTitle(title));
  }, [title]);

  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    []
  );

  const handlePriorityChange = useCallback(
    (v: string) => setPriority(v as SupportTicketPriority),
    []
  );

  const handleCategoryChange = useCallback(
    (v: string) => setCategory(v as TicketCategory),
    []
  );

  const handleCancel = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  const handleAttachClick = useCallback(() => fileRef.current?.click(), []);

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
        toast.error(getErrorMessage(err));
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

  const handleCreate = useCallback(() => {
    const titleErr = validateTitle(title);
    if (titleErr) {
      setTitleError(titleErr);
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    create.mutate(
      {
        title: title.trim(),
        category: category || undefined,
        description: description.trim() || undefined,
        priority,
      },
      {
        onSuccess: (ticket) => {
          if (pendingFiles.length > 0) {
            addMessage.mutate(
              {
                ticketId: ticket.id,
                body: "(attachment)",
                isInternal: false,
                attachments: pendingFiles,
              },
              {
                onSuccess: () => {
                  onOpenChange(false);
                  resetForm();
                  toast.success("Ticket created with attachments");
                },
                onError: () => {
                  onOpenChange(false);
                  resetForm();
                  toast.success("Ticket created (attachments failed to attach)");
                },
              }
            );
          } else {
            onOpenChange(false);
            resetForm();
            toast.success("Ticket created");
          }
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Failed to create ticket"),
      }
    );
  }, [create, addMessage, title, description, priority, category, pendingFiles, onOpenChange, resetForm]);

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

  const isBusy = create.isPending || addMessage.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Brief description of the issue"
              className={cn("mt-1", titleError && "border-destructive")}
              maxLength={150}
            />
            {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {title.trim().length}/150 characters
            </p>
          </div>
          <div>
            <Label className="text-xs">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
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
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low (48h SLA)</SelectItem>
                <SelectItem value="MEDIUM">Medium (24h SLA)</SelectItem>
                <SelectItem value="HIGH">High (8h SLA)</SelectItem>
                <SelectItem value="URGENT">Urgent (2h SLA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs">Attachments</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleAttachClick}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Paperclip className="h-3 w-3" />
                )}
                {uploading ? "Uploading..." : "Attach Files"}
              </Button>
            </div>
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => {
                  const Icon = fileMimeIcon(f.mimeType);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 text-[11px] bg-muted rounded px-2 py-1 border"
                    >
                      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]">{f.fileName}</span>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel} disabled={isBusy}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isBusy}>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
