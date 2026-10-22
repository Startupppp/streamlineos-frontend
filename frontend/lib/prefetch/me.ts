import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { assignedInterviewsQueryOptions } from "@/hooks/api/employee-self-service/recruitment-read-options";
import { expensePageDataQueryOptions } from "@/hooks/api/hr/expenses-read-options";
import { attendanceStatusQueryOptions } from "@/hooks/api/hr/attendance-read-options";
import { myOnboardingDocsQueryOptions } from "@/hooks/api/hr/documents-read-options";
import { mySupportRequestsQueryOptions } from "@/hooks/api/employee-self-service/support-read-options";
import { myResignationsQueryOptions } from "@/hooks/api/hr/exit-read-options";
import { managerHomeQueryOptions } from "@/hooks/api/hr/manager-home-read-options";
import { assignedInterviewsResponseContract } from "@/hooks/api/employee-self-service/recruitment-schema";
import { expensePageDataContract } from "@/hooks/api/hr/expenses-schema";
import { attendanceStatusContract } from "@/hooks/api/hr/attendance-schema";
import { myOnboardingDocsContract } from "@/hooks/api/hr/documents-schema";
import { helpdeskTicketListContract } from "@/hooks/api/hr/helpdesk-schema";
import { resignationListContract } from "@/hooks/api/hr/exit-schema";
import { managerHomeContract } from "@/hooks/api/hr/manager-home-schema";
import type { z } from "zod";

type AssignedInterviewsResponse = z.infer<typeof assignedInterviewsResponseContract>;
type ExpensePageDataResponse = z.infer<typeof expensePageDataContract>;
type AttendanceStatusResponse = z.infer<typeof attendanceStatusContract>;
type MyOnboardingDocsResponse = z.infer<typeof myOnboardingDocsContract>;
type ResignationListResponse = z.infer<typeof resignationListContract>;
type ManagerHomeResponse = z.infer<typeof managerHomeContract>;
type HelpdeskListResult = z.infer<typeof helpdeskTicketListContract>;

const PAGE_SIZES = {
  assignedInterviews: 20,
  supportRequests: 20,
  onboardingDocs: 25,
} as const;

export async function prefetchMeCareer() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("self:recruitment")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...assignedInterviewsQueryOptions(1),
      queryFn: () =>
        serverGet<AssignedInterviewsResponse>(
          `/me/recruitment?page=1&pageSize=${PAGE_SIZES.assignedInterviews}`,
          assignedInterviewsResponseContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeMoney() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...expensePageDataQueryOptions({}, true),
      queryFn: () =>
        serverGet<ExpensePageDataResponse>("/me/expenses", expensePageDataContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeWorkday() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("self:attendance")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...attendanceStatusQueryOptions(),
      queryFn: () =>
        serverGet<AttendanceStatusResponse>(
          "/me/attendance/status",
          attendanceStatusContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeRecords() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("self:onboarding-docs")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...myOnboardingDocsQueryOptions({ limit: PAGE_SIZES.onboardingDocs }),
      queryFn: () =>
        serverGet<MyOnboardingDocsResponse>(
          `/hr/onboarding-docs/me?limit=${PAGE_SIZES.onboardingDocs}`,
          myOnboardingDocsContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeSupport() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("self:support")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...mySupportRequestsQueryOptions({ limit: PAGE_SIZES.supportRequests }),
      queryFn: () =>
        serverGet<HelpdeskListResult>(
          `/me/support?limit=${PAGE_SIZES.supportRequests}`,
          helpdeskTicketListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeResignation() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("self:resignation")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...myResignationsQueryOptions(),
      queryFn: () =>
        serverGet<ResignationListResponse>("/me/resignations", resignationListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeTeam() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...managerHomeQueryOptions(),
      queryFn: () =>
        serverGet<ManagerHomeResponse>("/me/team", managerHomeContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
