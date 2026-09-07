"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type { WorkflowAnalytics, WorkflowTemplate } from "./workflows-types";

const workflowAnalyticsContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowAnalyticsContract),
);
const workflowTemplateListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowTemplateListContract),
);

export function useWorkflowAnalytics() {
  const canView = useCan("workflows:analytics:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.analytics(),
    queryFn: ({ signal }) => apiClient.get<WorkflowAnalytics>("/workflows/analytics", undefined, signal, workflowAnalyticsContract),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorkflowTemplates() {
  const canView = useCan("workflows:templates:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.templates(),
    queryFn: ({ signal }) => apiClient.get<WorkflowTemplate[]>("/workflows/templates", undefined, signal, workflowTemplateListContract),
    staleTime: 60_000,
    enabled: canView,
  });
}
