"use client";
import type { z } from "zod";
import type { templateRowContract as templateRowContractDef } from "@/hooks/api/build/roadmap-schema";
﻿
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const templateListContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.templateListContract),
);
const templateRowContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.templateRowContract),
);
const roadmapSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.roadmapSuccessContract),
);
const applyTemplateResultContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.applyTemplateResultContract),
);

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

export type ProjectTemplate = z.infer<typeof templateRowContractDef>;

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
    queryFn: ({ signal }) => apiClient.get<ProjectTemplate[]>("/build/templates", undefined, signal, templateListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateProjectTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "templates", "create"],
    mutationFn: (input: CreateProjectTemplateInput) =>
      apiClient.post<ProjectTemplate>("/build/templates", input, undefined, templateRowContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

export function useDeleteProjectTemplate() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", "templates", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/build/templates/${id}`, roadmapSuccessContract),
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
        undefined,
        applyTemplateResultContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.all });
    },
  });
}
