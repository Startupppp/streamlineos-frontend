"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const automationListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/automations-schema").then(
    (m) => m.pipelineAutomationWithCreatorListSchema,
  ),
);

const automationContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/automations-schema").then(
    (m) => m.pipelineAutomationResponseSchema,
  ),
);

const automationSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/automations-schema").then(
    (m) => m.automationSuccessSchema,
  ),
);

export type Trigger =
  | "STAGE_CHANGED"
  | "INTERVIEW_RESULT_SET"
  | "SLA_BREACHED"
  | "OFFER_SENT"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "SCORECARD_SUBMITTED";

export type Action =
  | "SEND_EMAIL"
  | "MOVE_TO_STAGE"
  | "CREATE_INTERVIEW"
  | "SEND_NOTIFICATION"
  | "NOTIFY_HIRING_MANAGER";

export interface PipelineAutomation {
  id: number;
  name: string;
  isActive: boolean;
  trigger: Trigger;
  action: Action;
  createdAt: string;
  creator?: { name: string | null } | null;
}

interface CreateAutomationInput {
  name: string;
  trigger: Trigger;
  action: Action;
  isActive: boolean;
}

interface ToggleAutomationInput {
  automationId: number;
  isActive: boolean;
}

export function useRecruitmentAutomations() {
  const can = useCan("hr:employees:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.pipelineAutomations(),
    queryFn: ({ signal }) =>
      apiClient.get<PipelineAutomation[]>("/hr/recruitment/automations", undefined, signal, automationListContract),
    staleTime: 60_000,
    enabled: can,
  });
}

export function useCreateRecruitmentAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PipelineAutomation, Error, CreateAutomationInput>(
    "hr:employees:manage",
    {
      mutationKey: ["hr", "recruitment", "automations", "create"],
      mutationFn: (data) =>
        apiClient.post<PipelineAutomation>("/hr/recruitment/automations", data, undefined, automationContract),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.pipelineAutomations() });
      },
    },
  );
}

export function useToggleRecruitmentAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation<PipelineAutomation, Error, ToggleAutomationInput>(
    "hr:employees:manage",
    {
      mutationKey: ["hr", "recruitment", "automations", "toggle"],
      mutationFn: ({ automationId, isActive }) =>
        apiClient.patch<PipelineAutomation>(`/hr/recruitment/automations/${automationId}`, { isActive }, undefined, automationContract),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.pipelineAutomations() });
      },
    },
  );
}

export function useDeleteRecruitmentAutomation() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, number>("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "automations", "delete"],
    mutationFn: (automationId) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/automations/${automationId}`, undefined, undefined, automationSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.pipelineAutomations() });
    },
  });
}
