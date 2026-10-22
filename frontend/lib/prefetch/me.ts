import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import { assignedInterviewsResponseContract } from "@/hooks/api/employee-self-service/recruitment-schema";
import { expensePageDataContract } from "@/hooks/api/hr/expenses-schema";
import { attendanceStatusContract } from "@/hooks/api/hr/attendance-schema";
import { myOnboardingDocsContract } from "@/hooks/api/hr/documents-schema";
import { resignationListContract } from "@/hooks/api/hr/exit-schema";
import { managerHomeContract } from "@/hooks/api/hr/manager-home-schema";
import { helpdeskTicketListContract } from "@/hooks/api/hr/helpdesk-schema";
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
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.hrAssignedInterviews(1),
    queryFn: () =>
      serverGet<AssignedInterviewsResponse>(
        `/me/recruitment?page=1&pageSize=${PAGE_SIZES.assignedInterviews}`,
        assignedInterviewsResponseContract,
      ),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeMoney() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [
      ...humanResourcesQueryKeys.hr.expenses(),
      "pageData",
      "self",
      {},
    ] as const,
    queryFn: () =>
      serverGet<ExpensePageDataResponse>("/me/expenses", expensePageDataContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeWorkday() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.attendanceStatus(),
    queryFn: () =>
      serverGet<AttendanceStatusResponse>(
        "/me/attendance/status",
        attendanceStatusContract,
      ),
    staleTime: 2 * 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeRecords() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.onboardingDocs({
      limit: PAGE_SIZES.onboardingDocs,
    }),
    queryFn: () =>
      serverGet<MyOnboardingDocsResponse>(
        `/hr/onboarding-docs/me?limit=${PAGE_SIZES.onboardingDocs}`,
        myOnboardingDocsContract,
      ),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeSupport() {
  const queryClient = await createServerQueryClient();
  const params = { limit: PAGE_SIZES.supportRequests };
  await queryClient.prefetchQuery({
    queryKey: employeeSupportQueryKeys.employeeSupport.myRequests(params),
    queryFn: () =>
      serverGet<HelpdeskListResult>(
        `/me/support?limit=${PAGE_SIZES.supportRequests}`,
        helpdeskTicketListContract,
      ),
    staleTime: 15_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeResignation() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "exit", "mine"] as const,
    queryFn: () =>
      serverGet<ResignationListResponse>("/me/resignations", resignationListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchMeTeam() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.myTeam(),
    queryFn: () =>
      serverGet<ManagerHomeResponse>("/me/team", managerHomeContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}
