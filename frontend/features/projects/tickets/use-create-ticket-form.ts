"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTicket, useAddAttachment, useProject } from "@/hooks/api";
import { useCycles } from "@/hooks/api/projects/advanced";
import { useProjectLabels } from "@/hooks/api/projects/projects";
import { useProjectMembers } from "@/hooks/api/projects/projects";
import { useAddLabelToTicket } from "@/hooks/api/projects/tickets";
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
  projectId: number;
  defaultStatus?: string;
  onCreated?: () => void;
}

export function useCreateTicketForm({ projectId, defaultStatus, onCreated }: UseCreateTicketFormOptions) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const pendingCycleDefaultRef = useRef(true);

  const { data: projectData } = useProject(projectId);
  const { data: cyclesRaw } = useCycles(projectId);
  const { data: labelsRaw } = useProjectLabels(projectId);
  const { data: membersRaw } = useProjectMembers(projectId);

  const cycles = useMemo<Cycle[]>(() => cyclesRaw ?? [], [cyclesRaw]);
  const labels = useMemo<TicketLabel[]>(() => labelsRaw ?? [], [labelsRaw]);
  const members = useMemo<ProjectMemberRecord[]>(() => membersRaw ?? [], [membersRaw]);

  const projectStatuses = useMemo<ProjectStatusRecord[]>(
    () => projectData?.statuses ?? [],
    [projectData],
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

  const handlePropertiesChange = useCallback((patch: Partial<CreateTicketPropertiesValue>) => {
    setProperties((prev) => ({ ...prev, ...patch }));
  }, []);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.tickets({ projectId }) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.sprints(projectId) });
    onCreated?.();
    if (createMore) {
      resetForm(true);
    } else {
      setOpen(false);
      resetForm(false);
    }
  }, [queryClient, projectId, createMore, resetForm, onCreated]);

  const createTicketMutation = useCreateTicket({
    onSuccess: async (data) => {
      const pendingLabels = properties.labelIds;
      const pendingFiles = files;

      const labelTask =
        pendingLabels.length > 0
          ? Promise.all(
              pendingLabels.map((labelId) =>
                addLabelMutation.mutateAsync({ ticketId: data.id, projectId, labelId }),
              ),
            ).catch(() => toast.error("Ticket created but some labels failed to attach"))
          : Promise.resolve();

      if (pendingFiles.length > 0) {
        try {
          setIsUploading(true);
          await labelTask;
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
        await labelTask;
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 25MB limit`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  }, []);

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
    isUploading,
    isPending: createTicketMutation.isPending,
    properties,
    handlePropertiesChange,
    handleSubmit,
    handleFileChange,
    handleRemoveFile,
    createMore,
    handleToggleCreateMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
  };
}
