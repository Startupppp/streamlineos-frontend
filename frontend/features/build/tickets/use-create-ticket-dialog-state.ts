"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useProjects } from "@/hooks/api/build/projects";
import {
  useCreateTicketAi,
  type CreateTicketAiFieldPatch,
} from "@/features/build/ai/create-ticket-ai-menu";
import type { AiInlineSession } from "@/components/ai";
import { useCreateTicketForm } from "./use-create-ticket-form";
import { useDuplicateTitleWarning } from "./use-duplicate-title-warning";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useTicketFileDrop } from "./use-ticket-file-drop";

interface UseCreateTicketDialogStateProps {
  lockedProjectId?: number;
  defaultStatus?: string;
  defaultCycleId?: number | null;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function useCreateTicketDialogState({
  lockedProjectId,
  defaultStatus,
  defaultCycleId,
  externalOpen,
  onExternalOpenChange,
}: UseCreateTicketDialogStateProps) {
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

  useRegisterDirtyState(resolvedOpen && form.formState.isDirty);

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

  const {
    previewUrls,
    fileError,
    handleFileChange,
    handleRemoveFileWithPreview,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = useTicketFileDrop({ files, addFiles, handleRemoveFile });

  const handleOpenTrigger = useCallback(() => setOpen(true), [setOpen]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v && (isPending || isUploading)) return;
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
      isPending,
      isUploading,
    ],
  );

  const handleProjectChange = useCallback((value: string) => {
    if (isPending || isUploading) return;
    const parsed = Number(value);
    setSelectedProjectId(Number.isFinite(parsed) ? parsed : null);
  }, [isPending, isUploading]);

  const handleShowLinksEditor = useCallback(() => setShowLinksEditor(true), []);

  const handleCreateMoreChange = useCallback(
    (_: boolean) => {
      handleToggleCreateMore();
    },
    [handleToggleCreateMore],
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

  return {
    projectLocked,
    selectedProjectId,
    resolvedOpen,
    form,
    files,
    relatedLinks,
    setRelatedLinks,
    isUploading,
    isPending,
    properties,
    handlePropertiesChange,
    createMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
    projects,
    projectsLoading,
    showLinksEditor,
    descriptionEditorKey,
    titleInlineSession,
    descriptionInlineSession,
    fieldsInlineSession,
    duplicates,
    previewUrls,
    fileError,
    createTicketAi,
    handleOpenTrigger,
    handleOpenChange,
    handleProjectChange,
    handleShowLinksEditor,
    handleCreateMoreChange,
    handleFileChange,
    handleRemoveFileWithPreview,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFormSubmit,
    canSubmit,
    projectSelectValue,
    projectTriggerLabel,
    currentProjectKey,
  };
}
