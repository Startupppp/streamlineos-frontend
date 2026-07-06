"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTicket, useAddAttachment, useProject } from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { createTicketInputSchema } from "@/lib/validation/projects";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AssigneeMember } from "./create-ticket-assignees";

const formSchema = createTicketInputSchema.omit({ projectId: true }).extend({
  assigneeIds: z.array(z.string()).optional(),
});

export type CreateTicketFormValues = z.infer<typeof formSchema>;

function isProjectWithManager(data: unknown): data is { manager?: AssigneeMember } {
  return typeof data === "object" && data !== null && "manager" in data;
}

export function useCreateTicketForm(projectId: number) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { data: projectData } = useProject(projectId);

  const members = useMemo<AssigneeMember[]>(() => {
    const projectMembersList =
      projectData?.members
        ?.filter(
          (m): m is typeof m & { user: NonNullable<typeof m.user> } => m.user != null,
        )
        .map((m) => ({
          id: m.user.id,
          name: m.user.name || `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim(),
          firstName: m.user.firstName ?? undefined,
          lastName: m.user.lastName ?? undefined,
          image: m.user.image ?? null,
          email: m.user.email,
        })) ?? [];

    const manager =
      projectData && isProjectWithManager(projectData) ? projectData.manager : undefined;

    if (manager && !projectMembersList.some((m) => m.id === manager.id)) {
      return [
        {
          id: manager.id,
          name:
            manager.name ||
            `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim(),
          firstName: manager.firstName ?? undefined,
          lastName: manager.lastName ?? undefined,
          image: manager.image ?? null,
        },
        ...projectMembersList,
      ];
    }
    return projectMembersList;
  }, [projectData]);

  const addAttachmentMutation = useAddAttachment();

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "TASK",
      description: "",
      priority: "MEDIUM",
      link: "",
      assigneeId: undefined,
      assigneeIds: [],
    },
  });

  const finishCreation = useCallback(() => {
    setOpen(false);
    form.reset();
    setFiles([]);
    setSelectedAssignees([]);
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  }, [form, queryClient, projectId]);

  const createTicketMutation = useCreateTicket({
    onSuccess: async (data) => {
      if (files.length > 0) {
        try {
          setIsUploading(true);
          await Promise.all(
            files.map(async (file) => {
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
          toast.success(
            `Ticket created with ${files.length} attachment${files.length > 1 ? "s" : ""}`,
          );
        } catch {
          toast.error("Ticket created but failed to upload attachments");
        } finally {
          setIsUploading(false);
          finishCreation();
        }
      } else {
        toast.success("Ticket created successfully");
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
        type: values.type,
        link: values.link || undefined,
        assigneeId: selectedAssignees[0] || undefined,
        assigneeIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
      });
    },
    [createTicketMutation, selectedAssignees, projectId],
  );

  const handleAssigneeSelect = useCallback((value: string) => {
    if (!value || value === "unassigned") return;
    setSelectedAssignees((prev) => (prev.includes(value) ? prev : [...prev, value]));
  }, []);

  const handleRemoveAssignee = useCallback((id: string) => {
    setSelectedAssignees((prev) => prev.filter((a) => a !== id));
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

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

  return {
    open,
    setOpen,
    form,
    files,
    selectedAssignees,
    isUploading,
    members,
    isPending: createTicketMutation.isPending,
    handleSubmit,
    handleAssigneeSelect,
    handleRemoveAssignee,
    handleRemoveFile,
    handleFileChange,
  };
}
