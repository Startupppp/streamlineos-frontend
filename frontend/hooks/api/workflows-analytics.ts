"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowAnalytics, WorkflowTemplate } from "./workflows-types";

export function useWorkflowAnalytics() {
  const canView = useCan("workflows:analytics:view");
  return useQuery({
    queryKey: queryKeys.workflows.analytics(),
    queryFn: () => apiClient.get<WorkflowAnalytics>("/workflows/analytics"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useWorkflowTemplates() {
  const canView = useCan("workflows:templates:view");
  return useQuery({
    queryKey: queryKeys.workflows.templates(),
    queryFn: () => apiClient.get<WorkflowTemplate[]>("/workflows/templates"),
    staleTime: 60_000,
    enabled: canView,
  });
}
