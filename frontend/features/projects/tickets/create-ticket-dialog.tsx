"use client";

import dynamic from "next/dynamic";
import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Paperclip,
  X,
  FileText,
  File,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";
import { useProjects } from "@/hooks/api/projects/projects";
import { useTicketSearch } from "@/hooks/api/projects/ticket-search";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { TicketCreateProperties } from "./ticket-create-properties";
import { TicketRelatedLinksEditor } from "./ticket-related-links-editor";

const TiptapEditorDynamic = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] animate-pulse rounded-md border border-border bg-muted/40" />
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

function AttachmentPreview({
  file,
  previewUrl,
  onRemove,
}: AttachmentPreviewProps) {
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
        <p className="text-[10px] text-muted-foreground">
          {formatBytes(file.size)}
        </p>
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

function useDuplicateTitleWarning(title: string, projectId: number | null) {
  const debouncedTitle = useDebouncedValue(title, 500);

  const trimmed = debouncedTitle.trim().toLowerCase();
  const enabled = trimmed.length >= 3 && projectId != null;

  const { data } = useTicketSearch(trimmed, { enabled });

  const matches = (data ?? []).filter(
    (r) =>
      projectId != null &&
      r.projectId === projectId &&
      r.title.trim().toLowerCase() === trimmed &&
      r.status !== "DONE" &&
      r.status !== "CANCELLED",
  );

  return matches;
}

interface CreateTicketDialogProps {
  projectId?: number;
  defaultStatus?: string;
  defaultCycleId?: number | null;
  variant?: "default" | "fab";
  hideTrigger?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function CreateTicketDialog({
  projectId: lockedProjectId,
  defaultStatus,
  defaultCycleId,
  variant = "default",
  hideTrigger = false,
  externalOpen,
  onExternalOpenChange,
}: CreateTicketDialogProps) {
  const projectLocked = lockedProjectId != null;
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    lockedProjectId ?? null,
  );

  const handleExternalClose = useCallback(() => {
    onExternalOpenChange?.(false);
  }, [onExternalOpenChange]);

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
    project,
  } = useCreateTicketForm({
    projectId: selectedProjectId,
    defaultStatus,
    defaultCycleId,
    onClose: handleExternalClose,
  });

  const resolvedOpen =
    externalOpen !== undefined ? externalOpen || internalOpen : internalOpen;

  const { data: projectsData, isLoading: projectsLoading } = useProjects(
    { status: "ACTIVE", limit: 100 },
    { enabled: resolvedOpen },
  );
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const [showLinksEditor, setShowLinksEditor] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const watchedTitle = form.watch("title") ?? "";
  const duplicates = useDuplicateTitleWarning(watchedTitle, selectedProjectId);

  useEffect(() => {
    if (lockedProjectId != null) {
      setSelectedProjectId(lockedProjectId);
    }
  }, [lockedProjectId]);

  useEffect(() => {
    if (externalOpen === true) setOpen(true);
  }, [externalOpen, setOpen]);

  useEffect(() => {
    if (!resolvedOpen) return;
    if (lockedProjectId != null) {
      setSelectedProjectId(lockedProjectId);
      return;
    }
    if (selectedProjectId == null && projects.length === 1) {
      const only = projects[0];
      if (only) setSelectedProjectId(only.id);
    }
  }, [resolvedOpen, lockedProjectId, projects, selectedProjectId]);

  useEffect(() => {
    const urls = files.map((f) => {
      if (isImageMime(f.type)) return URL.createObjectURL(f);
      return null;
    });
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  const handleOpenTrigger = useCallback(() => setOpen(true), [setOpen]);
  const handleOpenChange = useCallback(
    (v: boolean) => {
      setOpen(v);
      onExternalOpenChange?.(v);
      if (!v && !projectLocked) {
        setSelectedProjectId(null);
      }
    },
    [setOpen, onExternalOpenChange, projectLocked],
  );

  const handleProjectChange = useCallback((value: string) => {
    const parsed = Number(value);
    setSelectedProjectId(Number.isFinite(parsed) ? parsed : null);
  }, []);

  const handleAttachClick = useCallback(
    () => fileInputRef.current?.click(),
    [],
  );
  const handleShowLinksEditor = useCallback(() => setShowLinksEditor(true), []);
  const handleCreateMoreChange = useCallback(
    (_checked: boolean) => {
      handleToggleCreateMore();
    },
    [handleToggleCreateMore],
  );

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

  function makeRemoveFileHandler(idx: number) {
    return function removeFile() {
      handleRemoveFileWithPreview(idx);
    };
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
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
  const canSubmit = selectedProjectId != null;
  const projectSelectValue =
    selectedProjectId != null ? String(selectedProjectId) : undefined;
  const projectTriggerLabel =
    project?.key ??
    projects.find((p) => p.id === selectedProjectId)?.key ??
    (projectsLoading ? "Loading…" : "Select project");

  return (
    <>
      {!hideTrigger &&
        (variant === "fab" ? (
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
        ))}

      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-auto max-h-[min(720px,calc(100vh-100px))] flex-col gap-0 overflow-hidden p-0 md:flex md:h-auto md:max-h-[min(720px,calc(100vh-100px))] md:max-w-2xl md:overflow-hidden md:sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <Select
                value={projectSelectValue}
                onValueChange={handleProjectChange}
                disabled={projectLocked || projectsLoading}
              >
                <SelectTrigger
                  aria-label="Select project"
                  className="h-8 w-auto max-w-[220px] gap-1.5 border-border bg-card px-2 text-xs font-medium shadow-sm disabled:opacity-100"
                >
                  <SelectValue placeholder={projectTriggerLabel} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                        {p.key}
                      </span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                New Issue
              </DialogTitle>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleFormSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="shrink-0 space-y-2 border-b border-border/60 px-5 pb-3 pt-4">
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
                            titleRef.current = el;
                          }}
                          autoFocus
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Issue title"
                          className="w-full border-0 bg-transparent p-0 text-lg font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-0"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                      {duplicates.length > 0 && (
                        <div className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                              Similar open{" "}
                              {duplicates.length === 1 ? "ticket" : "tickets"}{" "}
                              already exist — you can still create this one.
                            </p>
                            <ul className="mt-0.5 space-y-0.5">
                              {duplicates.slice(0, 3).map((d) => (
                                <li
                                  key={d.id}
                                  className="text-[11px] text-amber-600 dark:text-amber-400"
                                >
                                  {d.projectKey}-{d.ticketNumber}: {d.title}{" "}
                                  <span className="text-amber-500 dark:text-amber-400">
                                    ({d.status})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="min-h-[120px] flex-1 overflow-y-auto overscroll-contain px-5 py-3 scrollbar-thin">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => {
                    function handleDescriptionHtmlChange(html: string) {
                      field.onChange(html);
                    }
                    return (
                      <FormItem className="min-h-[120px]">
                        <div className="min-h-[120px] cursor-text">
                          <TiptapEditorDynamic
                            content={field.value ?? ""}
                            onChangeHtml={handleDescriptionHtmlChange}
                            output="html"
                            minHeightClassName="min-h-[120px]"
                            placeholder="Add description…"
                            embedded
                          />
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    );
                  }}
                />

                {files.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {files.map((file, idx) => (
                      <AttachmentPreview
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        file={file}
                        previewUrl={previewUrls[idx] ?? null}
                        onRemove={makeRemoveFileHandler(idx)}
                      />
                    ))}
                  </div>
                )}

                {(showLinksEditor || relatedLinks.length > 0) && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                      Related links
                    </p>
                    <TicketRelatedLinksEditor
                      links={relatedLinks}
                      onChange={setRelatedLinks}
                    />
                  </div>
                )}

                {fileError && (
                  <p className="mt-2 text-[11px] text-destructive">
                    {fileError}
                  </p>
                )}
              </div>

              <div className="relative z-10 shrink-0 border-t border-border bg-background px-5 py-3">
                <TicketCreateProperties
                  value={properties}
                  onChange={handlePropertiesChange}
                  projectStatuses={projectStatuses}
                  members={members}
                  labels={labels}
                  cycles={cycles}
                />
              </div>

              <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    disabled={files.length >= MAX_FILES}
                    aria-label="Attach file"
                    className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {files.length >= MAX_FILES ? "Limit reached" : "Attach"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShowLinksEditor}
                    aria-label="Add related links"
                    className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
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
                    {files.length > 0 &&
                      ` · ${files.length}/${MAX_FILES} · ${formatBytes(totalSize)}`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
                    <Switch
                      checked={createMore}
                      onCheckedChange={handleCreateMoreChange}
                      aria-label="Create more"
                      className="border border-border data-[state=unchecked]:bg-muted"
                    />
                    <span className="text-xs text-muted-foreground">
                      Create more
                    </span>
                  </label>

                  <LoadingButton
                    type="submit"
                    isPending={isPending || isUploading}
                    loadingText="Creating…"
                    className="h-8 px-4 text-xs"
                    size="sm"
                    disabled={!canSubmit}
                  >
                    Create issue
                  </LoadingButton>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
