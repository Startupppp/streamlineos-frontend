"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTicket, useAddAttachment, useProject } from "@/hooks/api";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { useAddLabelToTicket } from "@/hooks/api/projects/tickets";
import { useAddRelatedLink } from "@/hooks/api/projects/ticket-related-links";
import type { RelatedLinkDraft } from "./ticket-related-links-editor";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { createTicketInputSchema } from "@/lib/validation/projects";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateTicketPropertiesValue } from "./ticket-create-properties";
import type { ProjectMemberRecord, ProjectStatusRecord, Cycle, TicketLabel } from "@/types/projects";

const formSchema = createTicketInputSchema.omit({ projectId: true, labelIds: true });

export type CreateTicketFormValues = z.infer<typeof formSchema>;

function findActiveCycle(cycles: Cycle[]): Cycle | null {
  const today = new Date().toISOString().slice(0, 10);
  const active = cycles.find((c) => c.status === "active");
  if (active) return active;
  return cycles.find((c) => c.startDate <= today && c.endDate >= today) ?? null;
}

export interface UseCreateTicketFormOptions {
  projectId: number | null;
  defaultStatus?: string;
  onCreated?: () => void;
  onClose?: () => void;
}

export function useCreateTicketForm({ projectId, defaultStatus, onCreated, onClose }: UseCreateTicketFormOptions) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [relatedLinks, setRelatedLinks] = useState<RelatedLinkDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const pendingCycleDefaultRef = useRef(true);
  const queryProjectId = projectId ?? 0;

  const { data: projectData } = useProject(queryProjectId);
  const { data: cyclesRaw } = useCycles(queryProjectId);
  const { data: labelsRaw } = useProjectLabels(projectId ?? undefined, {
    enabled: projectId != null,
  });
  const { data: membersRaw } = useProjectMembers(queryProjectId);

  const cycles = useMemo<Cycle[]>(() => (projectId != null ? cyclesRaw ?? [] : []), [cyclesRaw, projectId]);
  const labels = useMemo<TicketLabel[]>(() => (projectId != null ? labelsRaw ?? [] : []), [labelsRaw, projectId]);
  const members = useMemo<ProjectMemberRecord[]>(() => (projectId != null ? membersRaw ?? [] : []), [membersRaw, projectId]);

  const projectStatuses = useMemo<ProjectStatusRecord[]>(
    () => (projectId != null ? projectData?.statuses ?? [] : []),
    [projectData, projectId],
  );

  const defaultStatusValue = useMemo<string>(() => {
    if (defaultStatus) return defaultStatus;
    const first = projectStatuses[0];
    return first?.name ?? "TODO";
  }, [defaultStatus, projectStatuses]);

  const activeCycle = useMemo(() => findActiveCycle(cycles), [cycles]);

  const [properties, setProperties] = useState<CreateTicketPropertiesValue>({
    status: defaultStatusValue,
    priority: null,
    assigneeId: null,
    points: null,
    labelIds: [],
    cycleId: activeCycle?.id ?? null,
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

  const handlePropertiesChange = useCallback((patch: Partial<CreateTicketPropertiesValue>) => {
    setProperties((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    pendingCycleDefaultRef.current = true;
    setProperties((prev) => ({
      status: prev.status,
      priority: null,
      assigneeId: null,
      points: null,
      labelIds: [],
      cycleId: null,
    }));
  }, [projectId]);

  useEffect(() => {
    setProperties((prev) => ({ ...prev, status: defaultStatusValue }));
  }, [defaultStatusValue]);

  useEffect(() => {
    if (pendingCycleDefaultRef.current && activeCycle?.id != null) {
      setProperties((prev) => (prev.cycleId === null ? { ...prev, cycleId: activeCycle.id } : prev));
      pendingCycleDefaultRef.current = false;
    }
  }, [activeCycle?.id]);

  const resetForm = useCallback((preserveContext: boolean) => {
    form.reset({ title: "", type: "TASK", description: "" });
    setFiles([]);
    setRelatedLinks([]);
    if (!preserveContext) {
      pendingCycleDefaultRef.current = true;
      setProperties({
        status: defaultStatusValue,
        priority: null,
        assigneeId: null,
        points: null,
        labelIds: [],
        cycleId: activeCycle?.id ?? null,
      });
    } else {
      setProperties((prev) => ({ ...prev, priority: null, assigneeId: null, points: null, labelIds: [] }));
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [form, defaultStatusValue, activeCycle]);

  const finishCreation = useCallback(() => {
    if (projectId != null) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.sprints(projectId) });
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
    onSuccess: async (data) => {
      if (projectId == null) return;

      const pendingLabels = properties.labelIds;
      const pendingFiles = files;
      const pendingLinks = relatedLinks;

      const labelTask =
        pendingLabels.length > 0
          ? Promise.all(
              pendingLabels.map((labelId) =>
                addLabelMutation.mutateAsync({ ticketId: data.id, projectId, labelId }),
              ),
            ).catch(() => toast.error("Ticket created but some labels failed to attach"))
          : Promise.resolve();

      const linksTask =
        pendingLinks.length > 0
          ? Promise.all(
              pendingLinks.map((link) =>
                addRelatedLinkMutation.mutateAsync({
                  projectId,
                  ticketId: data.id,
                  url: link.url,
                  label: link.label || undefined,
                }),
              ),
            ).catch(() => toast.error("Ticket created but some links failed to attach"))
          : Promise.resolve();

      if (pendingFiles.length > 0) {
        try {
          setIsUploading(true);
          await Promise.all([labelTask, linksTask]);
          await Promise.all(
            pendingFiles.map(async (file) => {
              const formData = new FormData();
              formData.append("file", file);
              formData.append("folder", "tickets");
              const result = await apiClient.upload<{ url: string }>("/storage/upload", formData);
              await addAttachmentMutation.mutateAsync({
                ticketId: data.id,
                fileUrl: result.url,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
              });
            }),
          );
          toast.success(`Issue created with ${pendingFiles.length} attachment${pendingFiles.length > 1 ? "s" : ""}`);
        } catch {
          toast.error("Issue created but failed to upload attachments");
        } finally {
          setIsUploading(false);
          finishCreation();
        }
      } else {
        await Promise.all([labelTask, linksTask]);
        toast.success("Issue created");
        finishCreation();
      }
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
        assigneeIds: properties.assigneeId ? [properties.assigneeId] : undefined,
        points: properties.points ?? undefined,
        cycleId: properties.cycleId ?? undefined,
        link: values.link || undefined,
      });
    },
    [createTicketMutation, properties, projectId],
  );

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 25MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }, [addFiles]);

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
