"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


interface ProjectTemplateTicket {
  id: number;
  templateId: number;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  estimatedHours: string | null;
  order: number;
  phase: string | null;
}

export interface ProjectTemplate {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  category: string;
  createdBy: string | null;
  createdAt: string | null;
  tickets: ProjectTemplateTicket[];
}

interface CreateProjectTemplateInput {
  name: string;
  description?: string;
  category?: string;
  tickets: Array<{
    title: string;
    description?: string;
    type?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    estimatedHours?: number;
    order?: number;
    phase?: string;
  }>;
}

interface ApplyProjectTemplateInput {
  name: string;
  description?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
}

const TEMPLATES_KEY = buildWorkQueryKeys.projects.templates();


export function useProjectTemplates() {
  const canView = useCan("build:view");
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: ({ signal }) => apiClient.get<ProjectTemplate[]>("/build/templates", undefined, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "templates", "create"],
    mutationFn: (input: CreateProjectTemplateInput) =>
      apiClient.post<ProjectTemplate>("/build/templates", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useApplyProjectTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "templates", "apply"],
    mutationFn: ({ templateId, input }: { templateId: number; input: ApplyProjectTemplateInput }) =>
      apiClient.post<{ projectId: number; key: string; ticketsCreated: number }>(
        `/build/templates/${templateId}/apply`,
        input,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}
