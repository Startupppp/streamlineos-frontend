"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { useCan } from "@/hooks/api/access";

const opsInboxContract = lazyContract(() =>
  import("@/hooks/api/hr/service-delivery-schema").then((m) => m.opsInboxContract),
);
const myItemsContract = lazyContract(() =>
  import("@/hooks/api/hr/service-delivery-schema").then((m) => m.myItemsContract),
);

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
  const canCases = useCan("hr:cases:view");
  return useQuery({
    queryKey: serviceDeliveryKeys.opsInbox,
    queryFn: ({ signal }) =>
      apiClient.get("/hr/service-delivery/ops-inbox", undefined, signal, opsInboxContract),
    staleTime: 30_000,
    enabled: canCases && enabled,
  });
}

export function useServiceDeliveryMyItems(enabled = true) {
  const canHelpdesk = useCan("hr:helpdesk:view");
  return useQuery({
    queryKey: serviceDeliveryKeys.myItems,
    queryFn: ({ signal }) =>
      apiClient.get("/hr/service-delivery/my-items", undefined, signal, myItemsContract),
    staleTime: 30_000,
    enabled: canHelpdesk && enabled,
  });
}
