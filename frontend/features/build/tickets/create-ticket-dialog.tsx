"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { useProjects } from "@/hooks/api/build/projects";
import {
  useCreateTicketAi,
  CreateTicketAiFieldTrigger,
  type CreateTicketAiFieldPatch,
} from "@/features/build/ai/create-ticket-ai-menu";
import { AiInlinePreview, type AiInlineSession } from "@/components/ai";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { TicketCreateProperties } from "./ticket-create-properties";
import {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  MAX_FILE_BYTES,
  isImageMime,
} from "./ticket-attachment-preview";
import { useDuplicateTitleWarning } from "./use-duplicate-title-warning";
import { TicketDialogTitleField } from "./ticket-dialog-title-field";
import { TicketDialogDescriptionSection } from "./ticket-dialog-description-section";
import { TicketDialogFooter } from "./ticket-dialog-footer";

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
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [titleInlineSession, setTitleInlineSession] = useState<AiInlineSession | null>(null);
  const [descriptionInlineSession, setDescriptionInlineSession] = useState<AiInlineSession | null>(null);
  const [fieldsInlineSession, setFieldsInlineSession] = useState<AiInlineSession | null>(null);

  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const watchedTitle = form.watch("title") ?? "";
  const watchedDescription = form.watch("description") ?? "";
  const duplicates = useDuplicateTitleWarning(watchedTitle, selectedProjectId);

  const handleApplyAiTitle = useCallback(
    (nextTitle: string) => {
      form.setValue("title", nextTitle, { shouldValidate: true, shouldDirty: true });
    },
    [form],
  );

  const handleApplyAiDescription = useCallback(
    (html: string) => {
      form.setValue("description", html, { shouldValidate: true, shouldDirty: true });
      setDescriptionEditorKey((k) => k + 1);
    },
    [form],
  );

  const handleApplyAiFields = useCallback(
    (patch: CreateTicketAiFieldPatch) => {
      handlePropertiesChange({
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.points !== undefined ? { points: patch.points } : {}),
        ...(patch.labelIds !== undefined ? { labelIds: patch.labelIds } : {}),
      });
    },
    [handlePropertiesChange],
  );

  const createTicketAi = useCreateTicketAi({
    projectId: selectedProjectId,
    title: watchedTitle,
    description: watchedDescription,
    onApplyTitle: handleApplyAiTitle,
    onApplyDescription: handleApplyAiDescription,
    onApplyFields: handleApplyAiFields,
    onTitleInlineChange: setTitleInlineSession,
    onDescriptionInlineChange: setDescriptionInlineSession,
    onFieldsInlineChange: setFieldsInlineSession,
    disabled: isPending || isUploading,
  });

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
      if (!v) {
        titleInlineSession?.reject();
        descriptionInlineSession?.reject();
        fieldsInlineSession?.reject();
        setTitleInlineSession(null);
        setDescriptionInlineSession(null);
        setFieldsInlineSession(null);
      }
      setOpen(v);
      onExternalOpenChange?.(v);
      if (!v && !projectLocked) {
        setSelectedProjectId(null);
      }
    },
    [
      setOpen,
      onExternalOpenChange,
      projectLocked,
      titleInlineSession,
      descriptionInlineSession,
      fieldsInlineSession,
    ],
  );

  const handleProjectChange = useCallback((value: string) => {
    const parsed = Number(value);
    setSelectedProjectId(Number.isFinite(parsed) ? parsed : null);
  }, []);

  const handleShowLinksEditor = useCallback(() => setShowLinksEditor(true), []);
  const handleCreateMoreChange = useCallback(
    (_: boolean) => {
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

  const canSubmit = selectedProjectId != null;
  const projectSelectValue =
    selectedProjectId != null ? String(selectedProjectId) : undefined;
  const projectTriggerLabel =
    project?.key ??
    projects.find((p) => p.id === selectedProjectId)?.key ??
    (projectsLoading ? "Loading…" : "Select project");
  const currentProjectKey =
    project?.key ?? projects.find((p) => p.id === selectedProjectId)?.key;

  return (
    <>
      {!hideTrigger &&
        (variant === "fab" ? (
          <AnimatedIconButton
            size="lg"
            icon={PlusIcon}
            iconSize={24}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Create Issue"
            onClick={handleOpenTrigger}
          />
        ) : (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2" onClick={handleOpenTrigger}>
            Create Issue
          </AnimatedIconButton>
        ))}

      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-auto max-h-[min(720px,calc(100dvh-100px))] flex-col gap-0 overflow-hidden p-0 md:flex md:h-auto md:max-h-[min(720px,calc(100dvh-100px))] md:max-w-2xl md:overflow-hidden md:sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-2 pr-8">
              <Select
                value={projectSelectValue}
                onValueChange={handleProjectChange}
                disabled={projectLocked || projectsLoading}
              >
                <SelectTrigger
                  aria-label="Select project"
                  className="w-auto max-w-[220px] gap-1.5 border-border bg-card px-2 text-xs font-medium shadow-sm disabled:opacity-100"
                >
                  <SelectValue placeholder={projectTriggerLabel} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      <span className="mr-1.5 font-mono text-micro text-muted-foreground">
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
              <TicketDialogTitleField
                control={form.control}
                titleRef={titleRef}
                canUseAI={createTicketAi.canUseAI}
                titleTriggerProps={createTicketAi.titleTrigger}
                titleInlineSession={titleInlineSession}
                duplicates={duplicates}
              />

              <TicketDialogDescriptionSection
                control={form.control}
                descriptionEditorKey={descriptionEditorKey}
                canUseAI={createTicketAi.canUseAI}
                descriptionTriggerProps={createTicketAi.descriptionTrigger}
                descriptionInlineSession={descriptionInlineSession}
                files={files}
                previewUrls={previewUrls}
                onRemoveFile={handleRemoveFileWithPreview}
                showLinksEditor={showLinksEditor}
                relatedLinks={relatedLinks}
                onRelatedLinksChange={setRelatedLinks}
                selectedProjectId={selectedProjectId}
                projectKey={currentProjectKey}
                fileError={fileError}
              />

              <div className="relative z-10 shrink-0 border-t border-border bg-background px-5 py-3">
                {fieldsInlineSession ? (
                  <AiInlinePreview
                    session={fieldsInlineSession}
                    applyLabel="Apply suggestions"
                    previewMode="fields"
                    className="mb-3"
                  />
                ) : null}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TicketCreateProperties
                      value={properties}
                      onChange={handlePropertiesChange}
                      projectStatuses={projectStatuses}
                      members={members}
                      labels={labels}
                      cycles={cycles}
                    />
                  </div>
                  {createTicketAi.canUseAI ? (
                    <CreateTicketAiFieldTrigger
                      {...createTicketAi.fieldsTrigger}
                      className="mt-0.5 shrink-0"
                    />
                  ) : null}
                </div>
              </div>

              <TicketDialogFooter
                files={files}
                onFileChange={handleFileChange}
                onShowLinksEditor={handleShowLinksEditor}
                createMore={createMore}
                onCreateMoreChange={handleCreateMoreChange}
                isPending={isPending}
                isUploading={isUploading}
                canSubmit={canSubmit}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
