import { hrAutomationsListKey } from "@/hooks/api/hr/hr-automations-schema";

type AutomationListParams = { search?: string; triggerEvent?: string; isEnabled?: boolean; limit?: number };

export const hrAutomationsQueryOptions = (params?: AutomationListParams) => ({
  queryKey: hrAutomationsListKey(params),
  staleTime: 30_000,
}) as const;
