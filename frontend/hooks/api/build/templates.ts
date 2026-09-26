"use client";
import type { z } from "zod";
import type { templateRowContract as templateRowContractDef } from "@/hooks/api/build/roadmap-schema";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { NO_ID_CURSOR_YET } from "@/hooks/api/cursor-page-param";

const templateListContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.templateListContract),
);
const templateRowContract = lazyContract(() =>
  import("@/hooks/api/build/roadmap-schema").then((m) => m.templateRowContract),
);
const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
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
  return useInfiniteQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: ({ pageParam, signal }) => {
      const params: Record<string, string> = {};
      if (pageParam !== undefined) params["cursor"] = String(pageParam);
      return apiClient.get(
        "/build/templates",
        Object.keys(params).length > 0 ? params : undefined,
        signal,
        templateListContract,
      );
    },
    initialPageParam: NO_ID_CURSOR_YET,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
    mutationFn: (templateId: number) =>
      apiClient.delete<void>(`/build/templates/${templateId}`, undefined, undefined, noContentContract),
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
