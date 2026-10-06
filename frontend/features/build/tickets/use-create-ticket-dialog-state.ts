"use client";

import { useCallback, useLayoutEffect, useState, useMemo, useRef } from "react";
import { useProjects } from "@/hooks/api/build/projects";
import { useSourceOverride } from "@/hooks/common/use-source-override";
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
  const [selectedProjectId, setSelectedProjectId] = useSourceOverride(
    lockedProjectId ?? null,
    lockedProjectId ?? null,
  );

  const handleExternalClose = useCallback(() => {
    onExternalOpenChange?.(false);
  }, [onExternalOpenChange]);

  const [internalOpen, setOpen] = useState(false);
  const isExternallyControlled = externalOpen !== undefined;
  const resolvedOpen = isExternallyControlled
    ? Boolean(externalOpen)
    : internalOpen;

  const { data: projectsData, isLoading: projectsLoading } = useProjects(
    { status: "ACTIVE", limit: 100 },
    { enabled: resolvedOpen },
  );
  const projects = useMemo(() => projectsData?.data ?? [], [projectsData]);

  const effectiveProjectId =
    selectedProjectId !== null
      ? selectedProjectId
      : resolvedOpen && projects.length === 1
        ? (projects[0]?.id ?? null)
        : null;

  const {
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
    resetForm,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
    project,
  } = useCreateTicketForm({
    projectId: effectiveProjectId,
    defaultStatus,
    defaultCycleId,
    open: resolvedOpen,
    setOpen: (value: boolean) => {
      if (isExternallyControlled) {
        onExternalOpenChange?.(value);
        return;
      }
      setOpen(value);
    },
    onClose: handleExternalClose,
  });

  useRegisterDirtyState(resolvedOpen && form.formState.isDirty);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const pendingCloseRef = useRef(false);
  const isBusyRef = useRef(false);
  const isDirtyRef = useRef(false);
  useLayoutEffect(() => {
    isBusyRef.current = isPending || isUploading;
  }, [isPending, isUploading]);
  useLayoutEffect(() => {
    isDirtyRef.current = form.formState.isDirty;
  }, [form.formState.isDirty]);

  const [showLinksEditor, setShowLinksEditor] = useState(false);
  const [descriptionEditorKey, setDescriptionEditorKey] = useState(0);
  const [titleInlineSession, setTitleInlineSession] = useState<AiInlineSession | null>(null);
  const [descriptionInlineSession, setDescriptionInlineSession] = useState<AiInlineSession | null>(null);
  const [fieldsInlineSession, setFieldsInlineSession] = useState<AiInlineSession | null>(null);

  const watchedTitle = form.watch("title") ?? "";
  const watchedDescription = form.watch("description") ?? "";
  const duplicates = useDuplicateTitleWarning(watchedTitle, effectiveProjectId);

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
    projectId: effectiveProjectId,
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

  const handleOpenTrigger = useCallback(() => {
    if (isExternallyControlled) {
      onExternalOpenChange?.(true);
      return;
    }
    setOpen(true);
  }, [isExternallyControlled, onExternalOpenChange]);

  const finalizeClose = useCallback(() => {
    titleInlineSession?.reject();
    descriptionInlineSession?.reject();
    fieldsInlineSession?.reject();
    setTitleInlineSession(null);
    setDescriptionInlineSession(null);
    setFieldsInlineSession(null);
    setDiscardConfirmOpen(false);
    pendingCloseRef.current = false;
    resetForm(false);
    if (isExternallyControlled) {
      onExternalOpenChange?.(false);
    } else {
      setOpen(false);
    }
    if (!projectLocked) {
      setSelectedProjectId(null);
    }
  }, [
    titleInlineSession,
    descriptionInlineSession,
    fieldsInlineSession,
    resetForm,
    isExternallyControlled,
    onExternalOpenChange,
    projectLocked,
    setSelectedProjectId,
  ]);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v && isBusyRef.current) return;
      if (!v && isDirtyRef.current) {
        pendingCloseRef.current = true;
        setDiscardConfirmOpen(true);
        return;
      }
      if (!v) {
        finalizeClose();
        return;
      }
      if (isExternallyControlled) {
        onExternalOpenChange?.(true);
      } else {
        setOpen(true);
      }
    },
    [finalizeClose, isExternallyControlled, onExternalOpenChange],
  );

  const handleDiscardConfirm = useCallback(() => {
    finalizeClose();
  }, [finalizeClose]);

  const handleDiscardCancel = useCallback(() => {
    pendingCloseRef.current = false;
    setDiscardConfirmOpen(false);
  }, []);

  const handleProjectChange = useCallback((value: string) => {
    if (isPending || isUploading) return;
    const parsed = Number(value);
    setSelectedProjectId(Number.isFinite(parsed) ? parsed : null);
  }, [isPending, isUploading, setSelectedProjectId]);

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

  const canSubmit = effectiveProjectId != null;
  const projectSelectValue =
    effectiveProjectId != null ? String(effectiveProjectId) : undefined;
  const projectTriggerLabel =
    project?.key ??
    projects.find((p) => p.id === effectiveProjectId)?.key ??
    (projectsLoading ? "Loading…" : "Select project");
  const currentProjectKey =
    project?.key ?? projects.find((p) => p.id === effectiveProjectId)?.key;

  return {
    projectLocked,
    selectedProjectId: effectiveProjectId,
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
    discardConfirmOpen,
    handleDiscardConfirm,
    handleDiscardCancel,
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
