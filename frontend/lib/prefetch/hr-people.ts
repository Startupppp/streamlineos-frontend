import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { employeeListPageContract } from "@/hooks/api/hr/employee-list-schema";
import { onboardingStatusPageContract } from "@/hooks/api/hr/onboarding-schema";
import { documentTypeListPageContract } from "@/hooks/api/hr/document-types-schema";
import { emailTemplateListContract } from "@/hooks/api/hr/email-templates-schema";
import { handbookListContract } from "@/hooks/api/hr/handbook-schema";
import { bgvListContract } from "@/hooks/api/hr/background-verification-schema";
import { resignationListContract } from "@/hooks/api/hr/exit-schema";

const EMPLOYEES_LIMIT = 20;
const ONBOARDING_LIMIT = 25;
const DOC_TYPES_LIMIT = 20;
const EXIT_LIST_LIMIT = 20;

const { all: hrAll } = humanResourcesQueryKeys.hr;

export async function prefetchHrEmployees() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: EMPLOYEES_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.employees(params),
      queryFn: () =>
        serverGet(`/hr/employees?limit=${EMPLOYEES_LIMIT}`, employeeListPageContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrOnboarding() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.onboardingStatusPage(undefined, ONBOARDING_LIMIT),
      queryFn: () =>
        serverGet(
          `/onboarding/progress?limit=${ONBOARDING_LIMIT}`,
          onboardingStatusPageContract,
        ),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentTypes() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: DOC_TYPES_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.documentTypes(), params],
      queryFn: () =>
        serverGet(
          `/hr/document-types?limit=${DOC_TYPES_LIMIT}`,
          documentTypeListPageContract,
        ),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrEmailTemplates() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.emailTemplatesList(),
      queryFn: () => serverGet("/hr/email-templates", emailTemplateListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrHandbook() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...hrAll, "handbook", "list"],
      queryFn: () => serverGet("/hr/handbook", handbookListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrBackgroundVerifications() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: [...hrAll, "bgv", "list"],
      queryFn: () => serverGet("/hr/background-verification", bgvListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrExitList() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: EXIT_LIST_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: [...hrAll, "exit", "list", params],
      queryFn: () =>
        serverGet(`/hr/exit?limit=${EXIT_LIST_LIMIT}`, resignationListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
