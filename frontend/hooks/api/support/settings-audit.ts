"use client";

import { apiClient } from "@/lib/api-client";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useGatedQuery } from "@/hooks/api/gated-query";

export type SettingsAuditEntityType =
  | "sla_policy"
  | "business_hours"
  | "automation"
  | "channel"
  | "custom_field"
  | "routing_rule"
  | "agent_skill"
  | "agent_availability"
  | "vip_client";
export type SettingsAuditAction = "created" | "updated" | "deleted";

export interface SettingsAuditLogEntry {
  id: number;
  orgId: string;
  userId: string | null;
  entityType: SettingsAuditEntityType;
  entityId: string;
  action: SettingsAuditAction;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export function useSettingsAuditLog(entityType?: SettingsAuditEntityType) {
  return useGatedQuery("support:settings:manage", {
    queryKey: supportAndWorkflowsQueryKeys.supportSettingsAuditLog.list(entityType),
    queryFn: ({ signal }) =>
      apiClient.get<SettingsAuditLogEntry[]>(
        "/support/settings/audit-log",
        entityType ? { entityType } : undefined, signal,
      ),
    staleTime: 30_000,
  });
}
