"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export type AgingBucket = "fresh" | "watch" | "overdue" | "critical";

export interface ServiceDeliveryItem {
  kind: "case" | "safety_incident" | "helpdesk";
  id: number;
  ref: string;
  title: string;
  status: string;
  severity: string | null;
  assignedTo: string | null;
  href: string;
  createdAt: string;
  aging: {
    ageHours: number;
    ageDays: number;
    bucket: AgingBucket;
    slaBreached: boolean;
  };
  severityRank: number;
  confidential?: boolean;
}

export interface ServiceDeliveryOpsInbox {
  mode: "ops_unified_inbox";
  honestyNote: string;
  asOf: string;
  capabilities: {
    canViewCases: boolean;
    canViewSafety: boolean;
    canViewHelpdesk: boolean;
  };
  totals: {
    cases: number;
    safety: number;
    helpdesk: number;
    criticalAging: number;
    slaBreached: number;
  };
  items: ServiceDeliveryItem[];
}

export interface ServiceDeliveryMyItems {
  mode: "employee_self_service";
  honestyNote: string;
  items: ServiceDeliveryItem[];
  totals: { open: number };
}

export const serviceDeliveryKeys = {
  opsInbox: ["hr", "service-delivery", "ops-inbox"] as const,
  myItems: ["hr", "service-delivery", "my-items"] as const,
};

export function useServiceDeliveryOpsInbox(enabled = true) {
  return useQuery({
    queryKey: serviceDeliveryKeys.opsInbox,
    queryFn: () =>
      apiClient.get<ServiceDeliveryOpsInbox>("/hr/service-delivery/ops-inbox"),
    staleTime: 30_000,
    enabled,
  });
}

export function useServiceDeliveryMyItems(enabled = true) {
  return useQuery({
    queryKey: serviceDeliveryKeys.myItems,
    queryFn: () =>
      apiClient.get<ServiceDeliveryMyItems>("/hr/service-delivery/my-items"),
    staleTime: 30_000,
    enabled,
  });
}
