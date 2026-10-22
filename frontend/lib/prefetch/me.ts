import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { assignedInterviewsQueryOptions } from "@/hooks/api/employee-self-service/recruitment";
import { expensePageDataQueryOptions } from "@/hooks/api/hr/expenses";
import { attendanceStatusQueryOptions } from "@/hooks/api/hr/attendance";
import { myOnboardingDocsQueryOptions } from "@/hooks/api/hr/documents";
import { mySupportRequestsQueryOptions } from "@/hooks/api/employee-self-service/support";
import { myResignationsQueryOptions } from "@/hooks/api/hr/exit";
import { managerHomeQueryOptions } from "@/hooks/api/hr/manager-home";
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
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...assignedInterviewsQueryOptions(1),
    queryFn: () =>
      serverGet<AssignedInterviewsResponse>(
        `/me/recruitment?page=1&pageSize=${PAGE_SIZES.assignedInterviews}`,
        assignedInterviewsResponseContract,
      ),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeMoney() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...expensePageDataQueryOptions({}, true),
    queryFn: () =>
      serverGet<ExpensePageDataResponse>("/me/expenses", expensePageDataContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeWorkday() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...attendanceStatusQueryOptions(),
    queryFn: () =>
      serverGet<AttendanceStatusResponse>(
        "/me/attendance/status",
        attendanceStatusContract,
      ),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeRecords() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...myOnboardingDocsQueryOptions({ limit: PAGE_SIZES.onboardingDocs }),
    queryFn: () =>
      serverGet<MyOnboardingDocsResponse>(
        `/hr/onboarding-docs/me?limit=${PAGE_SIZES.onboardingDocs}`,
        myOnboardingDocsContract,
      ),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeSupport() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...mySupportRequestsQueryOptions({ limit: PAGE_SIZES.supportRequests }),
    queryFn: () =>
      serverGet<HelpdeskListResult>(
        `/me/support?limit=${PAGE_SIZES.supportRequests}`,
        helpdeskTicketListContract,
      ),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeResignation() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...myResignationsQueryOptions(),
    queryFn: () =>
      serverGet<ResignationListResponse>("/me/resignations", resignationListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchMeTeam() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...managerHomeQueryOptions(),
    queryFn: () =>
      serverGet<ManagerHomeResponse>("/me/team", managerHomeContract),
  });
  return dehydrate(queryClient);
}
