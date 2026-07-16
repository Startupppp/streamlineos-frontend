"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import { Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreatePortalTicket } from "@/hooks/api/support/portal";
import { usePortalActiveCustomFields } from "@/hooks/api/support/custom-fields";
import { PORTAL_CATEGORY_OPTIONS } from "./portal-ticket-constants";
import type { SupportMessageAttachment } from "@/types/support";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

const newTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters"),
  category: z.enum(["general", "billing", "bug_report", "feature_request", "onboarding", "internal_it"]),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description must be at most 5000 characters"),
});

type NewTicketFormValues = z.infer<typeof newTicketSchema>;

function fileMimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileText;
}

interface NewTicketSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTicketSheet({ open, onOpenChange }: NewTicketSheetProps) {
  const [pendingFiles, setPendingFiles] = useState<SupportMessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [customFieldError, setCustomFieldError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const createTicket = useCreatePortalTicket();
  const { data: customFields } = usePortalActiveCustomFields();

  const handleCustomFieldChange = useCallback((fieldId: number, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketSchema),
    defaultValues: { title: "", category: "general", description: "" },
  });

  const resetAll = useCallback(() => {
    form.reset({ title: "", category: "general", description: "" });
    setPendingFiles([]);
    setCustomFieldValues({});
    setCustomFieldError(null);
  }, [form]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetAll();
      onOpenChange(next);
    },
    [onOpenChange, resetAll],
  );

  const handleAttachClick = useCallback(() => fileRef.current?.click(), []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [pendingFiles.length]);

  const handleRemoveFile = useCallback((idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCategoryChange = useCallback(
    (v: string) => form.setValue("category", v as NewTicketFormValues["category"]),
    [form],
  );

  const handleSubmit = form.handleSubmit((values) => {
    const missingRequired = (customFields ?? []).find(
      (f) => f.required && !customFieldValues[f.id]?.trim(),
    );
    if (missingRequired) {
      setCustomFieldError(`"${missingRequired.label}" is required`);
      return;
    }
    setCustomFieldError(null);

    createTicket.mutate(
      {
        title: values.title,
        category: values.category,
        description: values.description,
        attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
        customFields: (customFields ?? [])
          .filter((f) => customFieldValues[f.id]?.trim())
          .map((f) => ({ fieldId: f.id, value: customFieldValues[f.id] })),
      },
      {
        onSuccess: () => {
          toast.success("Ticket created");
          handleOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  });

  const isBusy = createTicket.isPending || uploading;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 gap-1 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New Support Ticket</SheetTitle>
          <p className="text-xs text-muted-foreground">Tell us what you need help with and we&apos;ll get back to you.</p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                {...form.register("title")}
                placeholder="Brief description of the issue"
                className={cn("h-8", form.formState.errors.title && "border-destructive")}
                maxLength={150}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.watch("category")} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTAL_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                {...form.register("description")}
                placeholder="Describe your issue in detail..."
                className={cn("min-h-[120px]", form.formState.errors.description && "border-destructive")}
                maxLength={5000}
              />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {(customFields ?? []).map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-xs">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.fieldType === "select" ? (
                  <Select
                    value={customFieldValues[field.id] ?? ""}
                    onValueChange={(v) => handleCustomFieldChange(field.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.fieldType === "checkbox" ? (
                  <Select
                    value={customFieldValues[field.id] ?? "false"}
                    onValueChange={(v) => handleCustomFieldChange(field.id, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
                    value={customFieldValues[field.id] ?? ""}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}
            {customFieldError && <p className="text-xs text-destructive">{customFieldError}</p>}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Attachments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleAttachClick}
                  disabled={uploading || pendingFiles.length >= MAX_ATTACHMENTS}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                  {uploading ? "Uploading..." : "Attach Files"}
                </Button>
              </div>
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => {
                    const Icon = fileMimeIcon(f.mimeType);
                    return (
                      <div key={i} className="flex items-center gap-1 text-[11px] bg-muted rounded px-2 py-1 border">
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
          </SheetBody>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
