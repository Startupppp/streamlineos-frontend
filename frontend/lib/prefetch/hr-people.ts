import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { hrDocumentTypesPageQueryOptions } from "@/hooks/api/hr/document-types-read-options";
import { orgDelegationsQueryOptions } from "@/features/hr/governance/hooks/use-delegations-read-options";
import { positionsQueryOptions } from "@/features/hr/governance/hooks/use-positions-read-options";
import { employeeListQueryOptions } from "@/hooks/api/hr/employee-list-read-options";
import { onboardingStatusPageQueryOptions, onboardingUserQueryOptions } from "@/hooks/api/hr/onboarding-read-options";
import { emailTemplatesListQueryOptions } from "@/hooks/api/hr/email-templates-read-options";
import { handbookListQueryOptions } from "@/hooks/api/hr/handbook-read-options";
import { bgvListQueryOptions } from "@/hooks/api/hr/background-verification-read-options";
import { exitListQueryOptions, exitDetailQueryOptions } from "@/hooks/api/hr/exit-read-options";
import { managerCoverageQueryOptions } from "@/hooks/api/hr/reporting-lines-read-options";
import { skillsMatrixQueryOptions } from "@/hooks/api/hr/employee-insights-read-options";
import { onboardingDocsSummaryQueryOptions } from "@/hooks/api/hr/document-review-read-options";
import { documentTemplatesQueryOptions, documentTemplateDetailQueryOptions } from "@/hooks/api/hr/document-templates-read-options";
import { richDocumentDetailQueryOptions } from "@/hooks/api/hr/rich-documents-read-options";
import { fnfListQueryOptions } from "@/hooks/api/hr/fnf-read-options";
import { probationListQueryOptions } from "@/hooks/api/hr/probation-read-options";
import { reportingManagerRequestsQueryOptions } from "@/hooks/api/hr/reporting-manager-requests-read-options";
import { reportingLineBulkJobsQueryOptions, reportingLineBulkJobQueryOptions } from "@/hooks/api/hr/reporting-line-bulk-jobs-read-options";
import { terminationListQueryOptions } from "@/hooks/api/hr/termination-read-options";
import { orgRolesQueryOptions } from "@/hooks/api/hr/hr-org-read-options";
import { moduleMyPermissionsQueryOptions } from "@/hooks/api/module-access/catalog-read-options";
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
import { onboardingDocsSummaryContract } from "@/hooks/api/hr/document-review-schema";
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

export async function prefetchHrEmployees() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:employees:view")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrOnboarding() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:onboarding:manage")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrDocumentTypes() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:documents:manage")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrEmailTemplates() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:email-templates:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...emailTemplatesListQueryOptions(),
      queryFn: () =>
        serverGet("/hr/email-templates", emailTemplateListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrHandbook() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:employees:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...handbookListQueryOptions(),
      queryFn: () => serverGet("/hr/handbook", handbookListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrBackgroundVerifications() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:sensitive:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...bgvListQueryOptions(),
      queryFn: () => serverGet("/hr/background-verification", bgvListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrExitList() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:exit:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...exitListQueryOptions({ limit: EXIT_LIST_LIMIT }),
      queryFn: () =>
        serverGet(`/hr/exit?limit=${EXIT_LIST_LIMIT}`, resignationListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrExitDetail(resignationId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:exit:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...exitDetailQueryOptions(resignationId),
      queryFn: () =>
        serverGet(`/hr/exit/${resignationId}`, resignationDetailContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrManagerCoverage() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:employees:view")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrSkillsMatrix() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:employees:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...skillsMatrixQueryOptions({ cursor: undefined, limit: 20 }),
      queryFn: () =>
        serverGet("/hr/employees/skills-matrix?limit=20", skillsMatrixContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrProbationList() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:probation:view")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrDocumentReview() {
  try {
    const [queryClient, gate] = await Promise.all([createServerQueryClient(), resolvePrefetchGate()]);
    if (!gate.can("hr:onboarding:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...onboardingDocsSummaryQueryOptions({ cursor: undefined, limit: DOC_REVIEW_LIMIT }),
      queryFn: () =>
        serverGet(
          `/hr/onboarding-docs/summary?limit=${DOC_REVIEW_LIMIT}`,
          onboardingDocsSummaryContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrDocumentTemplates() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:documents:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...documentTemplatesQueryOptions(undefined),
      queryFn: () =>
        serverGet(
          "/hr/documents/templates",
          documentTemplateListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrDocumentTemplateDetail(templateId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:documents:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...documentTemplateDetailQueryOptions(templateId),
      queryFn: () =>
        serverGet(
          `/hr/documents/templates/${templateId}`,
          documentTemplateListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrRichDocument(documentId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:documents:view")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrDelegations() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:workflows:manage")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrFnf() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:payroll:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...fnfListQueryOptions(),
      queryFn: () => serverGet("/hr/fnf", fnfListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrOnboardingUser(userId: string) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:onboarding:tasks:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...onboardingUserQueryOptions(userId),
      queryFn: () =>
        serverGet(`/onboarding/tasks/${userId}`, onboardingTaskListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrReportingRequests() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:reporting-lines:review")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrReportingChanges() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:reporting-lines:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...reportingLineBulkJobsQueryOptions({ cursor: null }),
      queryFn: () =>
        serverGet("/hr/reporting-line-bulk-jobs", bulkJobPageContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrReportingChangesJob(jobId: string) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:reporting-lines:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...reportingLineBulkJobQueryOptions(jobId, undefined),
      queryFn: () =>
        serverGet(`/hr/reporting-line-bulk-jobs/${jobId}`, bulkJobContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrTerminationList() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:exit:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...terminationListQueryOptions({ cursor: "", limit: 20, status: "ALL" }),
      queryFn: () =>
        serverGet("/hr/termination?limit=20", terminationListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrOrgRoles() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:employees:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...orgRolesQueryOptions(),
      queryFn: () => serverGet("/hr/org/roles", jobRoleListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrPositions() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:positions:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...positionsQueryOptions(undefined),
      queryFn: () =>
        serverGet("/hr/governance/positions", positionListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrModuleAccess() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:access:view")) return dehydrate(queryClient);
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
    return dehydrate(await createServerQueryClient());
  }
}
