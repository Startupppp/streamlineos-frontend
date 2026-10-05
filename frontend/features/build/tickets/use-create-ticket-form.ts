"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTicket, useAddAttachment } from "@/hooks/api/build/tickets";
import { useProject } from "@/hooks/api/build/projects";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { useProjectMembers } from "@/hooks/api/build/projects";
import { useAddLabelToTicket } from "@/hooks/api/build/tickets";
import { useAddRelatedLink } from "@/hooks/api/build/ticket-related-links";
import { useUploadProjectFile, MAX_PROJECT_FILE_BYTES } from "@/hooks/api/build/project-files";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";
import type { CreateTicketPropertiesValue } from "./ticket-create-properties";
import type {
  ProjectMemberRecord,
  ProjectStatusRecord,
  Cycle,
  TicketLabel,
} from "@/types/projects";
import type { RelatedLinkDraft } from "./ticket-related-links-editor";
import {
  MAX_ATTACHMENT_MB,
  formSchema,
  type CreateTicketFormValues,
  findActiveCycle,
  resolveDefaultCycleId,
  type UseCreateTicketFormOptions,
  applyPostCreate,
} from "./ticket-create-model";

export function useCreateTicketForm({
  projectId,
  defaultStatus,
  defaultCycleId,
  onCreated,
  onClose,
}: UseCreateTicketFormOptions) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const pendingCycleDefaultRef = useRef(defaultCycleId === undefined);
  const queryProjectId = projectId ?? 0;

  const { data: projectData } = useProject(queryProjectId);
  const { data: cyclesRaw } = useCycles(queryProjectId);
  const { data: labelsRaw } = useProjectLabels(projectId ?? undefined, {
    enabled: projectId != null,
  });
  const { data: membersPage } = useProjectMembers(queryProjectId);
  const membersRaw = membersPage?.data;

  const cycles = useMemo<Cycle[]>(
    () => (projectId != null ? (cyclesRaw ?? []) : []),
    [cyclesRaw, projectId],
  );
  const labels = useMemo<TicketLabel[]>(
    () => (projectId != null ? (labelsRaw ?? []) : []),
    [labelsRaw, projectId],
  );
  const members = useMemo<ProjectMemberRecord[]>(
    () => (projectId != null && Array.isArray(membersRaw) ? membersRaw : []),
    [membersRaw, projectId],
  );

  const projectStatuses = useMemo<ProjectStatusRecord[]>(
    () => (projectId != null ? (projectData?.statuses ?? []) : []),
    [projectData, projectId],
  );

  const defaultStatusValue = useMemo<string>(() => {
    if (defaultStatus) return defaultStatus;
    const first = projectStatuses[0];
    return first?.name ?? "TODO";
  }, [defaultStatus, projectStatuses]);

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);
  const activeCycleId = activeCycle?.id ?? null;

  const [properties, setProperties] = useState<CreateTicketPropertiesValue>({
    status: defaultStatusValue,
    priority: null,
    assigneeId: null,
    points: null,
    labelIds: [],
    cycleId: resolveDefaultCycleId(defaultCycleId, activeCycleId),
  });

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "TASK",
      description: "",
    },
  });

  const addAttachmentMutation = useAddAttachment();
  const addLabelMutation = useAddLabelToTicket();
  const addRelatedLinkMutation = useAddRelatedLink();
  const uploadFileMutation = useUploadProjectFile(queryProjectId);

  const handlePropertiesChange = useCallback(
    (patch: Partial<CreateTicketPropertiesValue>) => {
      setProperties((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  useEffect(() => {
    pendingCycleDefaultRef.current = defaultCycleId === undefined;
    setProperties((prev) => ({
      status: prev.status,
      priority: null,
      assigneeId: null,
      points: null,
      labelIds: [],
      cycleId: resolveDefaultCycleId(defaultCycleId, null),
    }));
  }, [projectId, defaultCycleId]);

  useEffect(() => {
    setProperties((prev) => ({ ...prev, status: defaultStatusValue }));
  }, [defaultStatusValue]);

  useEffect(() => {
    if (defaultCycleId !== undefined) {
      setProperties((prev) => ({ ...prev, cycleId: defaultCycleId }));
      pendingCycleDefaultRef.current = false;
      return;
    }
    if (pendingCycleDefaultRef.current && activeCycleId != null) {
      setProperties((prev) =>
        prev.cycleId === null ? { ...prev, cycleId: activeCycleId } : prev,
      );
      pendingCycleDefaultRef.current = false;
    }
  }, [activeCycleId, defaultCycleId]);

  const resetForm = useCallback(
    (preserveContext: boolean) => {
      form.reset({ title: "", type: "TASK", description: "" });
      setFiles([]);
      setRelatedLinks([]);
      if (!preserveContext) {
        pendingCycleDefaultRef.current = defaultCycleId === undefined;
        setProperties({
          status: defaultStatusValue,
          priority: null,
          assigneeId: null,
          points: null,
          labelIds: [],
          cycleId: resolveDefaultCycleId(defaultCycleId, activeCycleId),
        });
      } else {
        setProperties((prev) => ({
          ...prev,
          priority: null,
          assigneeId: null,
          points: null,
          labelIds: [],
        }));
      }
      setTimeout(() => titleRef.current?.focus(), 50);
    },
    [form, defaultStatusValue, activeCycleId, defaultCycleId],
  );

  const finishCreation = useCallback(() => {
    if (projectId != null) {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.cycles(projectId),
      });
    }
    onCreated?.();
    if (createMore) {
      resetForm(true);
    } else {
      setOpen(false);
      onClose?.();
      resetForm(false);
    }
  }, [queryClient, projectId, createMore, resetForm, onCreated, onClose]);

  const createTicketMutation = useCreateTicket({
    onSuccess: (data) => {
      if (projectId == null) return;
      void applyPostCreate(data, {
        projectId,
        labelIds: properties.labelIds,
        files,
        relatedLinks,
        addLabel: (p) => addLabelMutation.mutateAsync(p),
        addRelatedLink: (p) => addRelatedLinkMutation.mutateAsync(p),
        uploadFile: (f) => uploadFileMutation.mutateAsync(f),
        addAttachment: (p) => addAttachmentMutation.mutateAsync(p),
        setIsUploading,
        onComplete: finishCreation,
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = useCallback(
    (values: CreateTicketFormValues) => {
      if (projectId == null) {
        toast.error("Select a project");
        return;
      }
      createTicketMutation.mutate({
        ...values,
        projectId,
        status: properties.status,
        priority: properties.priority ?? undefined,
        assigneeId: properties.assigneeId ?? undefined,
        assigneeIds: properties.assigneeId
          ? [properties.assigneeId]
          : undefined,
        points: properties.points ?? undefined,
        cycleId: properties.cycleId ?? undefined,
        link: values.link || undefined,
      });
    },
    [createTicketMutation, properties, projectId],
  );

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (f.size > MAX_PROJECT_FILE_BYTES) {
        toast.error(`${f.name} exceeds ${MAX_ATTACHMENT_MB}MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(e.target.files ?? []));
      e.target.value = "";
    },
    [addFiles],
  );

  const handleRemoveFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleToggleCreateMore = useCallback(() => {
    setCreateMore((prev) => !prev);
  }, []);

  return {
    open,
    setOpen,
    form,
    files,
    relatedLinks,
    setRelatedLinks,
    isUploading,
    isPending: createTicketMutation.isPending,
    properties,
    handlePropertiesChange,
    handleSubmit,
    handleFileChange,
    addFiles,
    handleRemoveFile,
    createMore,
    handleToggleCreateMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
    project: projectData ?? null,
  };
}
