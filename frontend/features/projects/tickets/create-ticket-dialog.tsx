"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, Paperclip, X, FileText, File, AlertTriangle, Link as LinkIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/api";
import { useTicketSearch } from "@/hooks/api/projects/ticket-search";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { TicketCreateProperties } from "./ticket-create-properties";
import { TicketRelatedLinksEditor } from "./ticket-related-links-editor";

const TiptapEditorDynamic = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-md bg-muted min-h-[80px]" />
    ),
  },
);

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

interface AttachmentPreviewProps {
  file: File;
  previewUrl: string | null;
  onRemove: () => void;
}

function AttachmentPreview({ file, previewUrl, onRemove }: AttachmentPreviewProps) {
  const isImage = isImageMime(file.type);

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="h-10 w-10 rounded object-cover shrink-0 border border-border"
        />
      ) : (
        <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center shrink-0">
          {file.type === "application/pdf" ? (
            <FileText className="h-5 w-5 text-red-500" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-medium">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function useDuplicateTitleWarning(title: string, projectId: number) {
  const debouncedTitle = useDebouncedValue(title, 500);

  const trimmed = debouncedTitle.trim().toLowerCase();
  const enabled = trimmed.length >= 3;

  const { data } = useTicketSearch(trimmed, { enabled });

  const matches = (data ?? []).filter(
    (r) =>
      r.projectId === projectId &&
      r.title.trim().toLowerCase() === trimmed &&
      r.status !== "DONE" &&
      r.status !== "CANCELLED",
  );

  return matches;
}

interface CreateTicketDialogProps {
  projectId: number;
  defaultStatus?: string;
  variant?: "default" | "fab";
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function CreateTicketDialog({
  projectId,
  defaultStatus,
  variant = "default",
  externalOpen,
  onExternalOpenChange,
}: CreateTicketDialogProps) {
  const { data: project } = useProject(projectId);

  const {
    open: internalOpen,
    setOpen,
    form,
    files,
    relatedLinks,
    setRelatedLinks,
    isUploading,
    isPending,
    properties,
    handlePropertiesChange,
    handleSubmit,
    addFiles,
    handleRemoveFile,
    createMore,
    handleToggleCreateMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
  } = useCreateTicketForm({ projectId, defaultStatus });

  const [showLinksEditor, setShowLinksEditor] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const watchedTitle = form.watch("title") ?? "";
  const duplicates = useDuplicateTitleWarning(watchedTitle, projectId);

  useEffect(() => {
    if (externalOpen === true) setOpen(true);
  }, [externalOpen, setOpen]);

  useEffect(() => {
    const urls = files.map((f) => {
      if (isImageMime(f.type)) return URL.createObjectURL(f);
      return null;
    });
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
  }, [files]);

  const resolvedOpen = externalOpen !== undefined ? externalOpen || internalOpen : internalOpen;

  const handleOpenTrigger = useCallback(() => setOpen(true), [setOpen]);
  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      onExternalOpenChange?.(v);
    },
    [setOpen, onExternalOpenChange],
  );
  const handleAttachClick = useCallback(() => fileInputRef.current?.click(), []);

  const validateAndAddFiles = useCallback(
    (selected: File[]) => {
      const nextCount = files.length + selected.length;
      if (nextCount > MAX_FILES) {
        setFileError(`You can upload up to ${MAX_FILES} files per ticket.`);
        return;
      }
      const oversized = selected.find((f) => f.size > MAX_FILE_BYTES);
      if (oversized) {
        setFileError(`${oversized.name} exceeds the 25MB per-file limit.`);
        return;
      }
      const currentTotal = files.reduce((sum, f) => sum + f.size, 0);
      const newTotal = selected.reduce((sum, f) => sum + f.size, currentTotal);
      if (newTotal > MAX_TOTAL_BYTES) {
        setFileError("Total attachments exceed the 100MB limit.");
        return;
      }
      setFileError(null);
      addFiles(selected);
    },
    [files, addFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      e.target.value = "";
      validateAndAddFiles(selected);
    },
    [validateAndAddFiles],
  );

  const handleRemoveFileWithPreview = useCallback(
    (idx: number) => {
      handleRemoveFile(idx);
    },
    [handleRemoveFile],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items.length > 0) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) validateAndAddFiles(dropped);
    },
    [validateAndAddFiles],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      form.handleSubmit(handleSubmit)();
    },
    [form, handleSubmit],
  );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      {variant === "fab" ? (
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Create Issue"
          onClick={handleOpenTrigger}
        >
          <Plus className="h-6 w-6" />
        </Button>
      ) : (
        <Button onClick={handleOpenTrigger}>
          <Plus className="mr-2 h-4 w-4" />
          Create Issue
        </Button>
      )}

      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="gap-0 p-0 overflow-hidden md:max-w-2xl md:sm:max-w-2xl">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              {project && (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] font-medium text-muted-foreground shrink-0"
                >
                  {project.key ?? project.name}
                </Badge>
              )}
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                New Issue
              </DialogTitle>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="px-5 pt-4 pb-2 space-y-3">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            (titleRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                          }}
                          autoFocus
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Issue title"
                          className="w-full bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none border-0 focus:ring-0 p-0 leading-tight"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                      {duplicates.length > 0 && (
                        <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 mt-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-amber-700 font-medium">
                              Similar open {duplicates.length === 1 ? "ticket" : "tickets"} already exist — you can still create this one.
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {duplicates.slice(0, 3).map((d) => (
                                <li key={d.id} className="text-[11px] text-amber-600">
                                  {d.projectKey}-{d.ticketNumber}: {d.title}{" "}
                                  <span className="text-amber-500">({d.status})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <TiptapEditorDynamic
                          content={field.value ?? ""}
                          onChangeHtml={(html) => field.onChange(html)}
                          output="html"
                          minHeightClassName="min-h-[80px]"
                          placeholder="Add description…"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="px-5 py-3 border-t border-border/60">
                <TicketCreateProperties
                  value={properties}
                  onChange={handlePropertiesChange}
                  projectStatuses={projectStatuses}
                  members={members}
                  labels={labels}
                  cycles={cycles}
                />
              </div>

              <div className="px-5 pb-2">
                {files.length > 0 ? (
                  <div className="space-y-1.5">
                    {files.map((file, idx) => (
                      <AttachmentPreview
                        key={idx}
                        file={file}
                        previewUrl={previewUrls[idx] ?? null}
                        onRemove={() => handleRemoveFileWithPreview(idx)}
                      />
                    ))}
                    {isDragging && (
                      <div className="flex items-center gap-2 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-xs text-primary">
                        <Upload className="h-3.5 w-3.5 shrink-0" />
                        Drop files to attach
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className={cn(
                      "w-full rounded-md border-2 border-dashed px-4 py-4 transition-colors",
                      "flex flex-col items-center gap-1.5 text-center",
                      isDragging
                        ? "border-primary/60 bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
                    )}
                    aria-label="Attach files"
                  >
                    <Upload className={cn("h-5 w-5", isDragging ? "text-primary" : "text-muted-foreground/60")} />
                    <span className="text-xs font-medium">
                      {isDragging ? "Drop files to attach" : "Click to upload or drag files here"}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      Images, PDF, DOC, XLS — up to 25MB each
                    </span>
                  </button>
                )}
              </div>

              {(showLinksEditor || relatedLinks.length > 0) && (
                <div className="px-5 pb-3 border-t border-border/60 pt-3">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Related links</p>
                  <TicketRelatedLinksEditor links={relatedLinks} onChange={setRelatedLinks} />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    disabled={files.length >= MAX_FILES}
                    aria-label="Attach file"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {files.length >= MAX_FILES ? "Limit reached" : "Attach"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinksEditor(true)}
                    aria-label="Add related links"
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Links
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileChange}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Up to {MAX_FILES} files, 25MB each, 100MB total
                    {files.length > 0 && ` · ${files.length}/${MAX_FILES} · ${formatBytes(totalSize)}`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={createMore}
                      onClick={handleToggleCreateMore}
                      className={cn(
                        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                        createMore ? "bg-primary" : "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-sm transition-transform",
                          createMore ? "translate-x-3" : "translate-x-0",
                        )}
                      />
                    </button>
                    <span className="text-xs text-muted-foreground">Create more</span>
                  </label>

                  <LoadingButton
                    type="submit"
                    isPending={isPending || isUploading}
                    loadingText="Creating…"
                    className="h-8 px-4 text-xs"
                    size="sm"
                  >
                    Create issue
                  </LoadingButton>
                </div>
              </div>

              {fileError && (
                <div className="px-5 pb-3">
                  <p className="text-[11px] text-destructive">{fileError}</p>
                </div>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
