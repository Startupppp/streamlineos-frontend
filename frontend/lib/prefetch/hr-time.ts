import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { NULL_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccessResult } from "@/lib/rbac/get-server-access";
import { attendanceStatusContract } from "@/hooks/api/hr/attendance-schema";
import { attendanceStatusQueryOptions } from "@/hooks/api/hr/attendance";
import { holidayListContract } from "@/hooks/api/hr/holidays-schema";
import { holidaysQueryOptions } from "@/hooks/api/hr/holidays";
import { geofenceListContract } from "@/hooks/api/hr/geofencing-schema";
import { geofencesQueryOptions } from "@/hooks/api/hr/geofencing";
import { rostersListContract } from "@/hooks/api/hr/rosters-schema";
import { rostersQueryOptions } from "@/hooks/api/hr/rosters";
import { shiftTemplateListContract } from "@/hooks/api/hr/shifts-schema";
import { hrShiftsQueryOptions } from "@/hooks/api/hr/shifts";
import { compOffBalanceListContract } from "@/hooks/api/hr/comp-off-schema";
import { compOffQueryOptions } from "@/hooks/api/hr/comp-off";
import { overtimeListContract } from "@/hooks/api/hr/overtime-schema";
import { overtimeRequestsQueryOptions } from "@/hooks/api/hr/overtime";
import { leaveContextContract } from "@/hooks/api/hr/leaves-schema";
import { leaveContextQueryOptions } from "@/hooks/api/hr/leaves-query-identity";
import { hrPolicyListContract } from "@/hooks/api/hr/policies-schema";
import { hrPoliciesQueryOptions } from "@/hooks/api/hr/policies";
import { hrTemplateListContract } from "@/hooks/api/hr/hr-templates-schema";
import { hrTemplatesQueryOptions } from "@/hooks/api/hr/hr-templates";
import { workflowDefinitionListContract } from "@/hooks/api/hr/hr-workflows-schema";
import { hrWorkflowDefinitionsQueryOptions } from "@/hooks/api/hr/hr-workflows";
import { automationRuleListContract } from "@/hooks/api/hr/hr-automations-schema";
import { hrAutomationsQueryOptions } from "@/hooks/api/hr/hr-automations";
import { hrWebhookSubscriptionListContract } from "@/hooks/api/hr/hr-webhooks-schema";
import { hrWebhooksQueryOptions } from "@/hooks/api/hr/hr-webhooks";
import {
  hrFormListContract,
  hrFormRowContract,
  hrFormSubmissionListContract,
} from "@/features/hr/forms/hooks/hr-forms-schema";
import {
  hrFormsListQueryOptions,
  hrFormDetailQueryOptions,
} from "@/features/hr/forms/hooks/use-hr-forms";
import { hrFormSubmissionsQueryOptions } from "@/features/hr/forms/hooks/use-hr-form-submissions";
import { hrFieldDefListContract } from "@/features/hr/custom-fields/hooks/hr-custom-fields-schema";
import { hrCustomFieldsQueryOptions } from "@/features/hr/custom-fields/hooks/use-hr-custom-fields";

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
type HrWebhookSubscriptionList = z.infer<
  typeof hrWebhookSubscriptionListContract
>;
type HrFormList = z.infer<typeof hrFormListContract>;
type HrFormRow = z.infer<typeof hrFormRowContract>;
type HrFormSubmissionList = z.infer<typeof hrFormSubmissionListContract>;
type HrFieldDefList = z.infer<typeof hrFieldDefListContract>;

export async function prefetchAttendanceStatus() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...attendanceStatusQueryOptions(),
      queryFn: () =>
        serverGet<AttendanceStatus>(
          "/me/attendance/status",
          attendanceStatusContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrHolidays() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("self:attendance"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...holidaysQueryOptions(),
      queryFn: () =>
        serverGet<HolidayList>("/me/attendance/holidays", holidayListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchGeofences() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...geofencesQueryOptions(),
      queryFn: () =>
        serverGet<GeofenceList>("/hr/geofencing", geofenceListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchRosters() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...rostersQueryOptions(),
      queryFn: () => serverGet<RosterList>("/hr/rosters", rostersListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchShifts() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:manage"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrShiftsQueryOptions(),
      queryFn: () =>
        serverGet<ShiftList>("/hr/shifts", shiftTemplateListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchCompOff() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:leaves:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...compOffQueryOptions(),
      queryFn: () =>
        serverGet<CompOffList>(
          "/hr/overtime/comp-off",
          compOffBalanceListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchOvertimeRequests() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:attendance:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...overtimeRequestsQueryOptions(),
      queryFn: () =>
        serverGet<OvertimeList>("/hr/overtime", overtimeListContract),
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
    if (!session?.orgId || !session.user?.id)
      return dehydrate(await createServerQueryClient());
    const accessVersion = accessResult.ok
      ? (accessResult.access.version ?? 0)
      : 0;
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...leaveContextQueryOptions(
        session.orgId,
        session.user.id,
        accessVersion,
      ),
      queryFn: () =>
        serverGet<LeaveContext>("/me/time-off", leaveContextContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrPolicies() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:policies:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrPoliciesQueryOptions(),
      queryFn: () =>
        serverGet<HrPolicyList>("/hr/policies", hrPolicyListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrTemplates() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:templates:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrTemplatesQueryOptions(),
      queryFn: () =>
        serverGet<HrTemplateList>("/hr/templates", hrTemplateListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWorkflows() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:workflows:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrWorkflowDefinitionsQueryOptions(),
      queryFn: () =>
        serverGet<WorkflowDefinitionList>(
          "/hr/workflows",
          workflowDefinitionListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrAutomations() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:automations:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchInfiniteQuery({
      ...hrAutomationsQueryOptions(),
      queryFn: () =>
        serverGet<AutomationRuleList>("/hr/automations", automationRuleListContract),
      initialPageParam: NULL_CURSOR_YET,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrForms() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrFormsListQueryOptions(),
      queryFn: () => serverGet<HrFormList>("/hr/forms", hrFormListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFormDetail(formId: number) {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrFormDetailQueryOptions(formId),
      queryFn: () =>
        serverGet<HrFormRow>(`/hr/forms/${formId}`, hrFormRowContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFormSubmissions(formId: number) {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:forms:view"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrFormSubmissionsQueryOptions(formId),
      queryFn: () =>
        serverGet<HrFormSubmissionList>(
          `/hr/forms/${formId}/submissions`,
          hrFormSubmissionListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrWebhooks() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:integrations:manage"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchInfiniteQuery({
      ...hrWebhooksQueryOptions(),
      queryFn: () =>
        serverGet<HrWebhookSubscriptionList>("/hr/webhooks", hrWebhookSubscriptionListContract),
      initialPageParam: NULL_CURSOR_YET,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrCustomFields() {
  try {
    const gate = await resolvePrefetchGate();
    if (!gate.can("hr:custom-fields:manage"))
      return dehydrate(await createServerQueryClient());
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrCustomFieldsQueryOptions("employee"),
      queryFn: () =>
        serverGet<HrFieldDefList>(
          "/hr/custom-fields/definitions?entityType=employee",
          hrFieldDefListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
