"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type { WorkflowAnalytics, WorkflowTemplate } from "./workflows-types";

export function useWorkflowAnalytics() {
  const canView = useCan("workflows:analytics:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.analytics(),
    queryFn: ({ signal }) => apiClient.get<WorkflowAnalytics>("/workflows/analytics", undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorkflowTemplates() {
  const canView = useCan("workflows:templates:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.templates(),
    queryFn: ({ signal }) => apiClient.get<WorkflowTemplate[]>("/workflows/templates", undefined, signal),
    staleTime: 60_000,
    enabled: canView,
  });
}
