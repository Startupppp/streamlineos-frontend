import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { delegationsListContract as hrGovernanceDelegationsListContract } from "@/features/hr/governance/hooks/delegations-schema";
import { employeeListPageContract } from "@/hooks/api/hr/employee-list-schema";
import { onboardingStatusPageContract, onboardingTaskListContract } from "@/hooks/api/hr/onboarding-schema";
import { documentTypeListPageContract } from "@/hooks/api/hr/document-types-schema";
import { emailTemplateListContract } from "@/hooks/api/hr/email-templates-schema";
import { handbookListContract } from "@/hooks/api/hr/handbook-schema";
import { bgvListContract } from "@/hooks/api/hr/background-verification-schema";
import { resignationListContract, resignationDetailContract } from "@/hooks/api/hr/exit-schema";
import { managerCoverageReportContract } from "@/hooks/api/hr/reporting-lines-schema";
import { skillsMatrixContract } from "@/hooks/api/hr/employee-insights-schema";
import { fnfListContract } from "@/hooks/api/hr/fnf-schema";
import { probationListContract } from "@/hooks/api/hr/probation-schema";
import { onboardingDocListContract } from "@/hooks/api/hr/document-review-schema";
import { documentTemplateListContract } from "@/hooks/api/hr/document-templates-schema";
import { richDocumentsListContract, richDocumentDetailContract } from "@/hooks/api/hr/rich-documents-schema";
import { hrReportingManagerRequestPageContract } from "@/hooks/api/hr/reporting-manager-requests-schema";
import { bulkJobPageContract, bulkJobContract } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { terminationListContract } from "@/hooks/api/hr/termination-schema";
import { jobRoleListContract } from "@/hooks/api/hr/hr-org-schema";
import { positionListContract } from "@/features/hr/governance/hooks/positions-schema";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { moduleMyPermissionsContract } from "@/hooks/api/module-access/module-access-schema";

const EMPLOYEES_LIMIT = 20;
const ONBOARDING_LIMIT = 25;
const DOC_TYPES_LIMIT = 20;
const EXIT_LIST_LIMIT = 20;
const PROBATION_LIMIT = 20;
const DOC_REVIEW_LIMIT = 20;
const DOC_TEMPLATES_LIMIT = 20;

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
      queryKey: humanResourcesQueryKeys.hr.handbookList(),
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
      queryKey: humanResourcesQueryKeys.hr.bgvList(),
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
      queryKey: humanResourcesQueryKeys.hr.exitList(params),
      queryFn: () =>
        serverGet(`/hr/exit?limit=${EXIT_LIST_LIMIT}`, resignationListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrExitDetail(resignationId: number) {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.exitDetail(resignationId),
      queryFn: () =>
        serverGet(`/hr/exit/${resignationId}`, resignationDetailContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrManagerCoverage() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.managerCoverage(),
      queryFn: () => serverGet("/hr/reporting-lines/coverage", managerCoverageReportContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrSkillsMatrix() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { cursor: undefined, limit: 20 };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.skillsMatrix(params),
      queryFn: () => serverGet("/hr/employees/skills-matrix?limit=20", skillsMatrixContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrProbationList() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: PROBATION_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.probationList(params),
      queryFn: () =>
        serverGet(`/hr/probation?limit=${PROBATION_LIMIT}`, probationListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentReview() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: DOC_REVIEW_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.onboardingDocs(params),
      queryFn: () =>
        serverGet(`/hr/onboarding-docs?limit=${DOC_REVIEW_LIMIT}`, onboardingDocListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentTemplates() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { limit: DOC_TEMPLATES_LIMIT };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.documentTemplates(params),
      queryFn: () =>
        serverGet(`/hr/document-templates?limit=${DOC_TEMPLATES_LIMIT}`, documentTemplateListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentTemplateDetail(templateId: number) {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.documentTemplate(templateId),
      queryFn: () =>
        serverGet(`/hr/document-templates/${templateId}`, documentTemplateListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrRichDocument(documentId: number) {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.richDocumentDetail(documentId),
      queryFn: () =>
        serverGet(`/hr/rich-documents/${documentId}`, richDocumentDetailContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDelegations() {
  try {
    const queryClient = await createServerQueryClient();
    const params = {};
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.hrDelegationsAll, "org", params],
      queryFn: () => serverGet("/hr/governance/delegations", hrGovernanceDelegationsListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrFnf() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.fnfList(),
      queryFn: () => serverGet("/hr/fnf", fnfListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrOnboardingUser(userId: string) {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.onboardingUser(userId),
      queryFn: () => serverGet(`/onboarding/tasks/${userId}`, onboardingTaskListContract),
      staleTime: 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrReportingRequests() {
  try {
    const queryClient = await createServerQueryClient();
    const filters = { status: null, cursor: null, limit: null };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.reportingManagerRequests(filters),
      queryFn: () => serverGet("/hr/reporting-manager-requests", hrReportingManagerRequestPageContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrReportingChanges() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.reportingLineBulkJobs({ cursor: null }),
      queryFn: () => serverGet("/hr/reporting-line-bulk-jobs", bulkJobPageContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrReportingChangesJob(jobId: string) {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.reportingLineBulkJob(jobId, undefined),
      queryFn: () => serverGet(`/hr/reporting-line-bulk-jobs/${jobId}`, bulkJobContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrTerminationList() {
  try {
    const queryClient = await createServerQueryClient();
    const params = { cursor: "", limit: 20, status: "ALL" };
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.terminationList(params),
      queryFn: () => serverGet("/hr/termination?limit=20", terminationListContract),
      staleTime: 2 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrOrgRoles() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: humanResourcesQueryKeys.hr.orgRoles(),
      queryFn: () => serverGet("/hr/org/roles", jobRoleListContract),
      staleTime: 5 * 60_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrPositions() {
  try {
    const queryClient = await createServerQueryClient();
    const params = undefined;
    await queryClient.prefetchQuery({
      queryKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, params],
      queryFn: () => serverGet("/hr/governance/positions", positionListContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrModuleAccess() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      queryKey: directoryAndOwnershipQueryKeys.moduleAccess.myPermissions("hr"),
      queryFn: () => serverGet("/module-access/hr/me/permissions", moduleMyPermissionsContract),
      staleTime: 30_000,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
