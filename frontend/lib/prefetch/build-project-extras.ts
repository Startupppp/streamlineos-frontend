import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import { changeRequestListContract } from "@/hooks/api/build/client-portal-schema";
import { riskPageContract, decisionPageContract } from "@/hooks/api/build/governance-schema";
import { meetingPageContract, meetingDetailContract } from "@/hooks/api/build/meetings-schema";
import { projectReleaseListContract } from "@/hooks/api/build/build-project-schema";
import { approvalPageContract } from "@/hooks/api/build/approvals-schema";
import { filePageContract } from "@/hooks/api/build/project-files-schema";
import { formResponseContract, formRowContract } from "@/hooks/api/build/forms-schema";
import {
  incidentsListIncidentsResponseSchema,
  incidentsGetIncidentResponseSchema,
  projectsSettingsIterationsGetSettingsResponseSchema,
  projectsRetentionSettingsGetSettingsResponseSchema,
} from "@/contracts/build-contracts.generated";
import { intakeListContract, viewPageContract } from "@/hooks/api/build/workspace-schema";
import { testSuiteListContract, testCasePageContract, testRunDetailContract } from "@/hooks/api/build/qa-schema";
import { updatePageContract } from "@/hooks/api/build/project-updates-schema";
import { portalSettingsContract } from "@/hooks/api/build/client-portal-management-schema";
import { feedbucketWidgetListContract } from "@/hooks/api/feedbucket/feedbucket-widget-schema";
import { feedbucketSubmissionDetailContract } from "@/hooks/api/feedbucket/feedbucket-schema";
import {
  projectMemberPageContract,
  projectAutomationListContract,
  buildCustomFieldListContract,
  projectWebhookListContract,
} from "@/hooks/api/build/build-project-schema";
import { agentTokenListContract } from "@/hooks/api/build/agent-tokens-schema";
import { workflowTransitionListContract } from "@/hooks/api/build/workflow-schema";
import {
  kbPageListContract,
  kbFavoritePageListContract,
  kbPageWithAncestorsContract,
  kbPageVersionListContract,
} from "@/hooks/api/kb/kb-pages-schema";
import { changeRequestsListQueryOptions } from "@/hooks/api/build/change-requests";
import { projectRisksListQueryOptions, projectDecisionsListQueryOptions } from "@/hooks/api/build/governance";
import { meetingsListQueryOptions, meetingDetailQueryOptions } from "@/hooks/api/build/meetings";
import { releasesListQueryOptions } from "@/hooks/api/build/releases";
import { projectApprovalsListQueryOptions } from "@/hooks/api/build/approvals";
import { projectFilesListQueryOptions } from "@/hooks/api/build/project-files";
import { formsListQueryOptions, formDetailQueryOptions } from "@/hooks/api/build/forms";
import { incidentsListQueryOptions, incidentDetailQueryOptions } from "@/hooks/api/build/incidents";
import { intakeRequestsQueryOptions } from "@/hooks/api/build/intake";
import { testSuitesQueryOptions, testCasesQueryOptions, testRunDetailQueryOptions } from "@/hooks/api/build/qa";
import { projectUpdatesListQueryOptions } from "@/hooks/api/build/project-updates";
import { portalSettingsQueryOptions } from "@/hooks/api/build/client-portal-management";
import { feedbucketWidgetsQueryOptions } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { feedbucketSubmissionQueryOptions } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { projectMembersQueryOptions } from "@/hooks/api/build/project-members";
import { agentTokensQueryOptions } from "@/hooks/api/build/agent-tokens";
import { automationsListQueryOptions } from "@/hooks/api/build/automations";
import { projectCustomFieldsQueryOptions } from "@/hooks/api/build/custom-fields";
import { webhooksListQueryOptions } from "@/hooks/api/build/webhooks";
import { iterationSettingsQueryOptions } from "@/hooks/api/build/iteration-settings";
import { retentionSettingsQueryOptions } from "@/hooks/api/build/project-retention-settings";
import { viewsListQueryOptions } from "@/hooks/api/build/views";
import { workflowTransitionsQueryOptions } from "@/hooks/api/build/workflow";
import {
  kbPagesRecentQueryOptions,
  kbPagesFavoritesQueryOptions,
  kbPageQueryOptions,
  kbPageVersionsQueryOptions,
} from "@/hooks/api/kb/kb-read-options";

export async function prefetchProjectChangeRequests(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:changerequests:view")) {
      await queryClient.prefetchQuery({
        ...changeRequestsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/change-requests`, changeRequestListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectIncidents(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:incidents:view")) {
      await queryClient.prefetchQuery({
        ...incidentsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/incidents`, incidentsListIncidentsResponseSchema),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectRisks(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:risks:view")) {
      await queryClient.prefetchQuery({
        ...projectRisksListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/risks`, riskPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectDecisions(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:decisions:view")) {
      await queryClient.prefetchQuery({
        ...projectDecisionsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/decisions`, decisionPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectMeetings(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:meetings:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...meetingsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/meetings`, meetingPageContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectReleases(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...releasesListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/releases`, projectReleaseListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectApprovals(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:approvals:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...projectApprovalsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/approvals`, approvalPageContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectFiles(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:files:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...projectFilesListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/files`, filePageContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectForms(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:forms:view")) {
      await queryClient.prefetchQuery({
        ...formsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/forms`, formResponseContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectIntake(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...intakeRequestsQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/intake`, intakeListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectQa(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:qa:view")) {
      await Promise.all([
        queryClient.prefetchQuery({
          ...testSuitesQueryOptions(projectId),
          queryFn: () => serverGet(`/build/${projectId}/test-suites`, testSuiteListContract),
        }),
        queryClient.prefetchQuery({
          ...testCasesQueryOptions(projectId),
          queryFn: () => serverGet(`/build/${projectId}/test-cases`, testCasePageContract),
        }),
      ]);
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchTestRunDetail(projectId: number, runId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:qa:view")) {
      await queryClient.prefetchQuery({
        ...testRunDetailQueryOptions(projectId, runId),
        queryFn: () => serverGet(`/build/${projectId}/test-runs/${runId}`, testRunDetailContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchMeetingDetail(projectId: number, meetingId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:meetings:view")) {
      await queryClient.prefetchQuery({
        ...meetingDetailQueryOptions(projectId, meetingId),
        queryFn: () =>
          serverGet(`/build/${projectId}/meetings/${meetingId}`, meetingDetailContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchIncidentDetail(projectId: number, incidentId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:incidents:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...incidentDetailQueryOptions(projectId, incidentId),
        queryFn: () =>
          serverGet(
            `/build/${projectId}/incidents/${incidentId}?limit=100`,
            incidentsGetIncidentResponseSchema,
          ),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchFormDetail(projectId: number, formId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:forms:view")) {
      await queryClient.prefetchQuery({
        ...formDetailQueryOptions(projectId, formId),
        queryFn: () => serverGet(`/build/${projectId}/forms/${formId}`, formRowContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectPortalSettings(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:clientvisibility:manage")) {
      await queryClient.prefetchQuery({
        ...portalSettingsQueryOptions(projectId),
        queryFn: () =>
          serverGet(`/build/${projectId}/client-portal/settings`, portalSettingsContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchFeedbucketWidgets() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("feedbucket:widgets:view")) {
      await queryClient.prefetchQuery({
        ...feedbucketWidgetsQueryOptions(),
        queryFn: () => serverGet("/feedbucket/widgets", feedbucketWidgetListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchFeedbucketSubmission(submissionId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("feedbucket:submissions:view")) {
      await queryClient.prefetchQuery({
        ...feedbucketSubmissionQueryOptions(submissionId),
        queryFn: () =>
          serverGet(`/feedbucket/submissions/${submissionId}`, feedbucketSubmissionDetailContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectUpdates(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:updates:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...projectUpdatesListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/updates`, updatePageContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectMembers(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...projectMembersQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/members`, projectMemberPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchAgentTokens() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("settings:api-tokens:read")) {
      await queryClient.prefetchQuery({
        ...agentTokensQueryOptions(),
        queryFn: () => serverGet("/agent-tokens", agentTokenListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectAutomations(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...automationsListQueryOptions(projectId),
        queryFn: () =>
          serverGet(`/build/${projectId}/automations`, projectAutomationListContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectCustomFields(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...projectCustomFieldsQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/custom-fields`, buildCustomFieldListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectWebhooks(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...webhooksListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/webhooks`, projectWebhookListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectIterationSettings(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...iterationSettingsQueryOptions(projectId),
        queryFn: () =>
          serverGet(
            `/build/${projectId}/settings/iterations`,
            projectsSettingsIterationsGetSettingsResponseSchema,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectRetentionSettings(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...retentionSettingsQueryOptions(projectId),
        queryFn: () =>
          serverGet(
            `/build/${projectId}/settings/retention`,
            projectsRetentionSettingsGetSettingsResponseSchema,
          ),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectViews(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...viewsListQueryOptions(projectId),
        queryFn: () => serverGet(`/build/${projectId}/views`, viewPageContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectWorkflow(projectId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("build:view")) {
      await queryClient.prefetchQuery({
        ...workflowTransitionsQueryOptions(projectId),
        queryFn: () =>
          serverGet(`/build/${projectId}/workflow/transitions`, workflowTransitionListContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchProjectWiki() {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("kb:pages:view")) {
      await Promise.all([
        queryClient.prefetchQuery({
          ...kbPagesRecentQueryOptions,
          queryFn: () => serverGet("/kb/pages/recent", kbPageListContract),
        }),
        queryClient.prefetchQuery({
          ...kbPagesFavoritesQueryOptions,
          queryFn: () => serverGet("/kb/pages/favorites", kbFavoritePageListContract),
        }),
      ]);
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchWikiPage(pageId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("kb:pages:view")) {
      await queryClient.prefetchQuery({
        ...kbPageQueryOptions(pageId),
        queryFn: () => serverGet(`/kb/pages/${pageId}`, kbPageWithAncestorsContract),
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchWikiPageHistory(pageId: number) {
  try {
    const gate = await resolvePrefetchGate();
    const queryClient = await createServerQueryClient();
    if (gate.can("kb:pages:view")) {
      await queryClient.prefetchInfiniteQuery({
        ...kbPageVersionsQueryOptions(pageId),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
          last.pagination.nextCursor ?? undefined,
        queryFn: () => serverGet(`/kb/pages/${pageId}/versions`, kbPageVersionListContract),
        pages: 1,
      });
    }
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
