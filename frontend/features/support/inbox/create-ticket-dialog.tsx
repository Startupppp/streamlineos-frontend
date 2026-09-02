"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateSupportTicket, useAddSupportMessage } from "@/hooks/api/support";
import { createTicketSchema, TICKET_CATEGORIES, type CreateTicketFormValues } from "./create-ticket-schema";
import { Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import type { SupportTicketPriority } from "@/types/support";

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

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const create = useCreateSupportTicket();
  const addMessage = useAddSupportMessage();

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      category: undefined,
      description: "",
      priority: "MEDIUM",
    },
  });

  const resetForm = useCallback(() => {
    form.reset();
    setPendingFiles([]);
  }, [form]);

  function handleOpenChange(v: boolean) {
    if (!v) resetForm();
    onOpenChange(v);
  }

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
          const json = await apiClient.upload<{ key: string }>("/storage/upload", fd);
          uploaded.push({
            fileName: file.name,
            fileUrl: json.key,
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
    [],
  );

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        title: values.title.trim(),
        category: values.category,
        description: values.description?.trim() || undefined,
        priority: values.priority as SupportTicketPriority,
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
              },
            );
          } else {
            onOpenChange(false);
            resetForm();
            toast.success("Ticket created");
          }
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  });

  const isBusy = create.isPending || addMessage.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3">
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
                      {...field}
                      placeholder="Brief description of the issue"
                      maxLength={150}
                    />
                  </FormControl>
                  <p className="text-micro text-muted-foreground">
                    {(field.value ?? "").trim().length}/150 characters
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((c) => (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Detailed description..."
                      className="min-h-[80px]"
                      maxLength={5000}
                    />
                  </FormControl>
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LOW">Low (48h SLA)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (24h SLA)</SelectItem>
                      <SelectItem value="HIGH">High (8h SLA)</SelectItem>
                      <SelectItem value="URGENT">Urgent (2h SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Attachments</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleAttachClick}
                  disabled={uploading}
                >
                  <Paperclip className="h-3 w-3" />
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
                        className="flex items-center gap-1 text-dense bg-muted rounded px-2 py-1 border"
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
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isBusy}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={isBusy} loadingText="Creating…">
                Create Ticket
              </LoadingButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
