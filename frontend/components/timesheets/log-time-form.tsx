"use client";

import Image from "next/image";
import { useRef } from "react";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, X, FileText } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type * as z from "zod";
import type { addTimeEntryInputSchema } from "@/lib/validation/projects";
import type { ProjectListItem, Ticket } from "@/types/projects";
import { LogTimeProjectSelect } from "./log-time-project-select";

const ACCEPT_ATTACHMENTS =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface LogTimeFormProps {
  form: UseFormReturn<z.infer<typeof addTimeEntryInputSchema>>;
  projects: ProjectListItem[];
  tickets: Ticket[];
  isLoadingTickets: boolean;
  attachmentFiles: File[];
  attachmentPreviews: (string | null)[];
  uploading: boolean;
  onProjectChange: (projectId: number) => void;
  onAttachmentFilesChange: (files: File[]) => void;
  onAttachmentPreviewsChange: (previews: (string | null)[]) => void;
}

export function LogTimeForm({
  form,
  projects,
  tickets,
  isLoadingTickets,
  attachmentFiles,
  attachmentPreviews,
  uploading,
  onProjectChange,
  onAttachmentFilesChange,
  onAttachmentPreviewsChange,
}: LogTimeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const allowed = ACCEPT_ATTACHMENTS.split(",").map((t) => t.trim());
    const newFiles: File[] = [];
    const newPreviews: (string | null)[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
      if (!allowed.includes(file.type)) {
        toast.error(
          `${file.name}: Only images (JPEG, PNG, GIF, WebP) or PDF allowed`,
        );
        return;
      }
      newFiles.push(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onAttachmentPreviewsChange(
            [...attachmentPreviews, ...newPreviews].map((p, i) => {
              if (i === attachmentFiles.length + newFiles.indexOf(file)) {
                return reader.result as string;
              }
              return p;
            }),
          );
        };
        reader.readAsDataURL(file);
        newPreviews.push(null);
      } else {
        newPreviews.push(null);
      }
    });

    if (newFiles.length > 0) {
      onAttachmentFilesChange([...attachmentFiles, ...newFiles]);
      onAttachmentPreviewsChange([...attachmentPreviews, ...newPreviews]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    onAttachmentFilesChange(attachmentFiles.filter((_, i) => i !== index));
    onAttachmentPreviewsChange(attachmentPreviews.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleHoursChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: number) => void,
  ) => {
    const value = e.target.value;
    onChange(value === "" ? 0 : parseFloat(value));
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <LogTimeProjectSelect
          form={form}
          projects={projects}
          tickets={tickets}
          isLoadingTickets={isLoadingTickets}
          onProjectChange={onProjectChange}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                    onChange={(v) =>
                      field.onChange(v ? new Date(v) : new Date())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="8"
                    value={field.value || ""}
                    onChange={(e) => handleHoursChange(e, field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What did you work on?"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Link</FormLabel>
              <FormControl>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://example.com/work-done"
                    className="pl-9"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={() => (
            <FormItem>
              <FormLabel>Attachments (images or PDF)</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUploadClick}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload files"}
                    </Button>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={ACCEPT_ATTACHMENTS}
                      onChange={handleAttachmentChange}
                      multiple
                    />
                  </div>
                  {attachmentFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachmentFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                        >
                          {attachmentPreviews[index] ? (
                            <Image
                              src={attachmentPreviews[index]!}
                              alt="Preview"
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 object-cover rounded"
                            />
                          ) : file.type === "application/pdf" ? (
                            <div className="h-12 w-12 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-red-500" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(index)}
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Images (JPEG, PNG, GIF, WebP) or PDF, max 10MB each. Multiple
                    files allowed.
                  </p>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}
