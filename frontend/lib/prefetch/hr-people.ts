import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { hrDocumentTypesPageQueryOptions } from "@/hooks/api/hr/document-types";
import { orgDelegationsQueryOptions } from "@/features/hr/governance/hooks/use-delegations";
import { positionsQueryOptions } from "@/features/hr/governance/hooks/use-positions";
import { employeeListQueryOptions } from "@/hooks/api/hr/employee-list";
import { onboardingStatusPageQueryOptions, onboardingUserQueryOptions } from "@/hooks/api/hr/onboarding";
import { emailTemplatesListQueryOptions } from "@/hooks/api/hr/email-templates";
import { handbookListQueryOptions } from "@/hooks/api/hr/handbook";
import { bgvListQueryOptions } from "@/hooks/api/hr/background-verification";
import { exitListQueryOptions, exitDetailQueryOptions } from "@/hooks/api/hr/exit";
import { managerCoverageQueryOptions } from "@/hooks/api/hr/reporting-lines";
import { skillsMatrixQueryOptions } from "@/hooks/api/hr/employee-insights";
import { hrOnboardingDocAdminListQueryOptions } from "@/hooks/api/hr/document-review";
import { documentTemplatesQueryOptions, documentTemplateDetailQueryOptions } from "@/hooks/api/hr/document-templates";
import { richDocumentDetailQueryOptions } from "@/hooks/api/hr/rich-documents";
import { fnfListQueryOptions } from "@/hooks/api/hr/fnf";
import { probationListQueryOptions } from "@/hooks/api/hr/probation";
import { reportingManagerRequestsQueryOptions } from "@/hooks/api/hr/reporting-manager-requests";
import { reportingLineBulkJobsQueryOptions, reportingLineBulkJobQueryOptions } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import { terminationListQueryOptions } from "@/hooks/api/hr/termination";
import { orgRolesQueryOptions } from "@/hooks/api/hr/hr-org";
import { moduleMyPermissionsQueryOptions } from "@/hooks/api/module-access/catalog";
import { delegationsListContract as hrGovernanceDelegationsListContract } from "@/features/hr/governance/hooks/delegations-schema";
import { employeeListPageContract } from "@/hooks/api/hr/employee-list-schema";
import {
  onboardingStatusPageContract,
  onboardingTaskListContract,
} from "@/hooks/api/hr/onboarding-schema";
import { documentTypeListPageContract } from "@/hooks/api/hr/document-types-schema";
import { emailTemplateListContract } from "@/hooks/api/hr/email-templates-schema";
import { handbookListContract } from "@/hooks/api/hr/handbook-schema";
import { bgvListContract } from "@/hooks/api/hr/background-verification-schema";
import {
  resignationListContract,
  resignationDetailContract,
} from "@/hooks/api/hr/exit-schema";
import { managerCoverageReportContract } from "@/hooks/api/hr/reporting-lines-schema";
import { skillsMatrixContract } from "@/hooks/api/hr/employee-insights-schema";
import { fnfListContract } from "@/hooks/api/hr/fnf-schema";
import { probationListContract } from "@/hooks/api/hr/probation-schema";
import { onboardingDocListContract } from "@/hooks/api/hr/document-review-schema";
import { documentTemplateListContract } from "@/hooks/api/hr/document-templates-schema";
import { richDocumentDetailContract } from "@/hooks/api/hr/rich-documents-schema";
import { hrReportingManagerRequestPageContract } from "@/hooks/api/hr/reporting-manager-requests-schema";
import {
  bulkJobPageContract,
  bulkJobContract,
} from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { terminationListContract } from "@/hooks/api/hr/termination-schema";
import { jobRoleListContract } from "@/hooks/api/hr/hr-org-schema";
import { positionListContract } from "@/features/hr/governance/hooks/positions-schema";
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
    await queryClient.prefetchQuery({
      ...employeeListQueryOptions({ limit: EMPLOYEES_LIMIT }),
      queryFn: () =>
        serverGet(
          `/hr/employees?limit=${EMPLOYEES_LIMIT}`,
          employeeListPageContract,
        ),
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
      ...onboardingStatusPageQueryOptions(undefined, ONBOARDING_LIMIT),
      queryFn: () =>
        serverGet(
          `/onboarding/progress?limit=${ONBOARDING_LIMIT}`,
          onboardingStatusPageContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentTypes() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrDocumentTypesPageQueryOptions(undefined, DOC_TYPES_LIMIT),
      queryFn: () =>
        serverGet(
          `/hr/document-types?limit=${DOC_TYPES_LIMIT}`,
          documentTypeListPageContract,
        ),
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
      ...emailTemplatesListQueryOptions(),
      queryFn: () =>
        serverGet("/hr/email-templates", emailTemplateListContract),
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
      ...handbookListQueryOptions(),
      queryFn: () => serverGet("/hr/handbook", handbookListContract),
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
      ...bgvListQueryOptions(),
      queryFn: () => serverGet("/hr/background-verification", bgvListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrExitList() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...exitListQueryOptions({ limit: EXIT_LIST_LIMIT }),
      queryFn: () =>
        serverGet(`/hr/exit?limit=${EXIT_LIST_LIMIT}`, resignationListContract),
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
      ...exitDetailQueryOptions(resignationId),
      queryFn: () =>
        serverGet(`/hr/exit/${resignationId}`, resignationDetailContract),
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
      ...managerCoverageQueryOptions(),
      queryFn: () =>
        serverGet(
          "/hr/reporting-lines/coverage",
          managerCoverageReportContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrSkillsMatrix() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...skillsMatrixQueryOptions({ cursor: undefined, limit: 20 }),
      queryFn: () =>
        serverGet("/hr/employees/skills-matrix?limit=20", skillsMatrixContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrProbationList() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...probationListQueryOptions({ limit: PROBATION_LIMIT }),
      queryFn: () =>
        serverGet(
          `/hr/probation?limit=${PROBATION_LIMIT}`,
          probationListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentReview() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...hrOnboardingDocAdminListQueryOptions({ limit: DOC_REVIEW_LIMIT }),
      queryFn: () =>
        serverGet(
          `/hr/onboarding-docs?limit=${DOC_REVIEW_LIMIT}`,
          onboardingDocListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDocumentTemplates() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...documentTemplatesQueryOptions(undefined),
      queryFn: () =>
        serverGet(
          `/hr/document-templates?limit=${DOC_TEMPLATES_LIMIT}`,
          documentTemplateListContract,
        ),
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
      ...documentTemplateDetailQueryOptions(templateId),
      queryFn: () =>
        serverGet(
          `/hr/document-templates/${templateId}`,
          documentTemplateListContract,
        ),
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
      ...richDocumentDetailQueryOptions(documentId),
      queryFn: () =>
        serverGet(
          `/hr/rich-documents/${documentId}`,
          richDocumentDetailContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrDelegations() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...orgDelegationsQueryOptions({}),
      queryFn: () =>
        serverGet(
          "/hr/governance/delegations",
          hrGovernanceDelegationsListContract,
        ),
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
      ...fnfListQueryOptions(),
      queryFn: () => serverGet("/hr/fnf", fnfListContract),
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
      ...onboardingUserQueryOptions(userId),
      queryFn: () =>
        serverGet(`/onboarding/tasks/${userId}`, onboardingTaskListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrReportingRequests() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...reportingManagerRequestsQueryOptions({ status: null, cursor: null, limit: null }),
      queryFn: () =>
        serverGet(
          "/hr/reporting-manager-requests",
          hrReportingManagerRequestPageContract,
        ),
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
      ...reportingLineBulkJobsQueryOptions({ cursor: null }),
      queryFn: () =>
        serverGet("/hr/reporting-line-bulk-jobs", bulkJobPageContract),
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
      ...reportingLineBulkJobQueryOptions(jobId, undefined),
      queryFn: () =>
        serverGet(`/hr/reporting-line-bulk-jobs/${jobId}`, bulkJobContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrTerminationList() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...terminationListQueryOptions({ cursor: "", limit: 20, status: "ALL" }),
      queryFn: () =>
        serverGet("/hr/termination?limit=20", terminationListContract),
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
      ...orgRolesQueryOptions(),
      queryFn: () => serverGet("/hr/org/roles", jobRoleListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}

export async function prefetchHrPositions() {
  try {
    const queryClient = await createServerQueryClient();
    await queryClient.prefetchQuery({
      ...positionsQueryOptions(undefined),
      queryFn: () =>
        serverGet("/hr/governance/positions", positionListContract),
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
      ...moduleMyPermissionsQueryOptions("hr"),
      queryFn: () =>
        serverGet(
          "/module-access/hr/me/permissions",
          moduleMyPermissionsContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
