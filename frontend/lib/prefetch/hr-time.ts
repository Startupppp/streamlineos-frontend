import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { attendanceStatusContract } from "@/hooks/api/hr/attendance-schema";
import { holidayListContract } from "@/hooks/api/hr/holidays-schema";
import { geofenceListContract } from "@/hooks/api/hr/geofencing-schema";
import { rostersListContract } from "@/hooks/api/hr/rosters-schema";
import { shiftTemplateListContract } from "@/hooks/api/hr/shifts-schema";
import { compOffBalanceListContract } from "@/hooks/api/hr/comp-off-schema";
import { overtimeListContract } from "@/hooks/api/hr/overtime-schema";
import { leaveContextContract } from "@/hooks/api/hr/leaves-schema";
import { hrPolicyListContract } from "@/hooks/api/hr/policies-schema";
import { hrTemplateListContract } from "@/hooks/api/hr/hr-templates-schema";
import { workflowDefinitionListContract } from "@/hooks/api/hr/hr-workflows-schema";
import { automationRuleListContract, hrAutomationsListKey } from "@/hooks/api/hr/hr-automations-schema";
import { hrWebhookSubscriptionListContract, hrWebhooksListKey } from "@/hooks/api/hr/hr-webhooks-schema";
import { hrFormListContract, hrFormRowContract, hrFormSubmissionListContract, hrFormsListKey, hrFormSubmissionsListKey } from "@/features/hr/forms/hooks/hr-forms-schema";
import { hrFieldDefListContract, hrCustomFieldsListKey } from "@/features/hr/custom-fields/hooks/hr-custom-fields-schema";

type AttendanceStatus = z.infer<typeof attendanceStatusContract>;
type HolidayList = z.infer<typeof holidayListContract>;
type GeofenceList = z.infer<typeof geofenceListContract>;
type RosterList = z.infer<typeof rostersListContract>;
type ShiftList = z.infer<typeof shiftTemplateListContract>;
type CompOffList = z.infer<typeof compOffBalanceListContract>;
type OvertimeList = z.infer<typeof overtimeListContract>;
type LeaveContext = z.infer<typeof leaveContextContract>;
type HrPolicyList = z.infer<typeof hrPolicyListContract>;
type HrTemplateList = z.infer<typeof hrTemplateListContract>;
type WorkflowDefinitionList = z.infer<typeof workflowDefinitionListContract>;
type AutomationRuleList = z.infer<typeof automationRuleListContract>;
type HrWebhookSubscriptionList = z.infer<typeof hrWebhookSubscriptionListContract>;
type HrFormList = z.infer<typeof hrFormListContract>;
type HrFormRow = z.infer<typeof hrFormRowContract>;
type HrFormSubmissionList = z.infer<typeof hrFormSubmissionListContract>;
type HrFieldDefList = z.infer<typeof hrFieldDefListContract>;

export async function prefetchAttendanceStatus() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.attendanceStatus(),
      queryFn: () => serverGet<AttendanceStatus>("/me/attendance/status", attendanceStatusContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrHolidays() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("self:attendance")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.holidays(),
      queryFn: () => serverGet<HolidayList>("/me/attendance/holidays", holidayListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchGeofences() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"],
      queryFn: () => serverGet<GeofenceList>("/hr/geofencing", geofenceListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchRosters() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"],
      queryFn: () => serverGet<RosterList>("/hr/rosters", rostersListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchShifts() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"],
      queryFn: () => serverGet<ShiftList>("/hr/shifts", shiftTemplateListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchCompOff() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:leaves:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.compOff(),
      queryFn: () => serverGet<CompOffList>("/hr/overtime/comp-off", compOffBalanceListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchOvertimeRequests() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests", {}],
      queryFn: () => serverGet<OvertimeList>("/hr/overtime", overtimeListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchLeaveContext() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("self:leaves") && !gate.can("hr:leaves:view")) {
      return dehydrate(await createServerQueryClient());
    }
    const [session, accessResult] = await Promise.all([
      getServerAuth(),
      getServerAccessResult(),
    ]);
    if (!session?.orgId || !session.user?.id) return dehydrate(await createServerQueryClient());
    const accessVersion = accessResult.ok ? (accessResult.access.version ?? 0) : 0;
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.leaves(session.orgId, session.user.id, accessVersion),
      queryFn: () => serverGet<LeaveContext>("/me/time-off", leaveContextContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrPolicies() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:policies:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.hrPoliciesList(undefined),
      queryFn: () => serverGet<HrPolicyList>("/hr/policies", hrPolicyListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrTemplates() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:templates:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.hrTemplates(undefined),
      queryFn: () => serverGet<HrTemplateList>("/hr/templates", hrTemplateListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWorkflows() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:workflows:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowsAll, undefined],
      queryFn: () => serverGet<WorkflowDefinitionList>("/hr/workflows", workflowDefinitionListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrAutomations() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:automations:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: hrAutomationsListKey(undefined),
      queryFn: async () => {
        const page = await serverGet<AutomationRuleList>("/hr/automations", automationRuleListContract);
        return page.items;
      },
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrForms() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: hrFormsListKey(),
      queryFn: () => serverGet<HrFormList>("/hr/forms", hrFormListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFormDetail(formId: number) {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.hrFormsAll, formId],
      queryFn: () => serverGet<HrFormRow>(`/hr/forms/${formId}`, hrFormRowContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFormSubmissions(formId: number) {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: hrFormSubmissionsListKey(formId),
      queryFn: () => serverGet<HrFormSubmissionList>(`/hr/forms/${formId}/submissions`, hrFormSubmissionListContract),
      staleTime: 15_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWebhooks() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:integrations:manage")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: hrWebhooksListKey(undefined),
      queryFn: async () => {
        const page = await serverGet<HrWebhookSubscriptionList>("/hr/webhooks", hrWebhookSubscriptionListContract);
        return page.items;
      },
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrCustomFields() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:custom-fields:manage")) return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: hrCustomFieldsListKey("employee"),
      queryFn: () => serverGet<HrFieldDefList>("/hr/custom-fields/definitions?entityType=employee", hrFieldDefListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
