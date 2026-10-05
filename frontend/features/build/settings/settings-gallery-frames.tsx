"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { AccessResponse } from "@/hooks/api/access-schema";
import type { IterationSettings } from "@/hooks/api/build/iteration-settings-schema";
import type { ProjectsRetentionSettingsGetSettingsResponse } from "@/contracts/build-contracts.generated";
import type { ProjectAutomation } from "@/hooks/api/build/automations";
import type { AgentToken } from "@/hooks/api/build/agent-tokens-schema";
import type { CustomState } from "@/hooks/api/build/custom-states";
import { ProjectSettingsIterationsPage } from "@/features/build/settings/project-settings-iterations-page";
import { ProjectSettingsRetentionPage } from "@/features/build/settings/project-settings-retention-page";
import { ProjectSettingsFieldsPage } from "@/features/build/settings/project-settings-fields-page";
import { ProjectSettingsAgentsPage } from "@/features/build/settings/project-settings-agents-page";
import { ProjectSettingsIntegrationsPage } from "@/features/build/settings/project-settings-integrations-page";
import { AutomationsPage } from "@/features/build/automations/automations-page";
import { StatusesSettings } from "@/features/build/settings/statuses-settings";
import { type ViewItem } from "@/features/build/views/saved-views/view-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PmPanel } from "@/components/pm-chrome";

export const noop = () => undefined;

const GALLERY_PROJECT_ID = 1;

const STUB_ACCESS: AccessResponse = {
  membershipId: null,
  scopes: {},
  isOrgOwner: true,
  canManageOrganizationMembership: false,
  modules: {},
};

const STUB_ITERATION_SETTINGS: IterationSettings = {
  defaultDurationWeeks: 2,
  namingPrefix: "Sprint",
};

const STUB_RETENTION_SETTINGS: ProjectsRetentionSettingsGetSettingsResponse = {
  projectId: GALLERY_PROJECT_ID,
  inheritOrgPolicy: false,
  closedTicketRetentionDays: 90,
  attachmentRetentionDays: 180,
  auditLogRetentionDays: 365,
  legalHold: false,
  legalHoldReason: null,
  legalHoldSetAt: null,
  version: 1,
  updatedAt: "2026-01-01T00:00:00Z",
};

const STUB_AUTOMATIONS: ProjectAutomation[] = [
  {
    id: 1,
    projectId: GALLERY_PROJECT_ID,
    name: "Auto-assign on ticket create",
    isActive: true,
    triggerEvent: "ticket.created",
    conditions: [],
    actions: [{ type: "set_assignee", value: "user_gallery" }],
    createdBy: "user_gallery",
    createdByUser: {
      name: "Gallery User",
      firstName: "Gallery",
      lastName: "User",
      email: "gallery@example.com",
    },
    lastRunAt: "2026-09-20T10:00:00Z",
    lastFailureAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
  },
];

const STUB_AGENT_TOKENS: AgentToken[] = [
  {
    id: 1,
    name: "CI automation bot",
    tokenPrefix: "slat_bot1",
    scopes: ["build:read"],
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: null,
    lastUsedAt: "2026-09-01T00:00:00Z",
    revokedAt: null,
  },
];

const STUB_CUSTOM_STATES: CustomState[] = [
  {
    id: 1,
    orgId: "org_gallery",
    projectId: GALLERY_PROJECT_ID,
    name: "In Progress",
    color: null,
    order: 1,
    type: "started",
    wipLimit: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    orgId: "org_gallery",
    projectId: GALLERY_PROJECT_ID,
    name: "Done",
    color: null,
    order: 2,
    type: "completed",
    wipLimit: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 3,
    orgId: "org_gallery",
    projectId: GALLERY_PROJECT_ID,
    name: "Todo",
    color: null,
    order: 3,
    type: "unstarted",
    wipLimit: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

export const STATIC_VIEWS: ViewItem[] = [
  {
    id: 1,
    name: "Engineering backlog",
    layoutType: "list",
    isPinned: true,
    createdBy: "user_a",
    filters: null,
  },
  {
    id: 2,
    name: "Sprint board",
    layoutType: "board",
    isPinned: false,
    createdBy: "user_b",
    filters: null,
  },
  {
    id: 3,
    name: "Roadmap calendar",
    layoutType: "calendar",
    isPinned: false,
    createdBy: "user_a",
    filters: null,
  },
  {
    id: 4,
    name: "Release tracker",
    layoutType: "table",
    isPinned: true,
    createdBy: "user_b",
    filters: null,
  },
];

export function IterationsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-iterations-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.iterationSettings(GALLERY_PROJECT_ID),
      STUB_ITERATION_SETTINGS,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSettingsIterationsPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function RetentionReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-retention-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.retentionSettings(GALLERY_PROJECT_ID),
      STUB_RETENTION_SETTINGS,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSettingsRetentionPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function FieldsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-fields-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSettingsFieldsPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function AgentsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-agents-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.agentTokens(),
      STUB_AGENT_TOKENS,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSettingsAgentsPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function IntegrationsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-integrations-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectSettingsIntegrationsPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function AutomationsReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-automations-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    client.setQueryData(
      [...buildWorkQueryKeys.projects.automations(GALLERY_PROJECT_ID), {}],
      STUB_AUTOMATIONS,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AutomationsPage projectId={GALLERY_PROJECT_ID} />
    </QueryClientProvider>
  );
}

export function WorkflowReadyFrame() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("settings-workflow-ready");
    client.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);
    client.setQueryData(
      buildWorkQueryKeys.projects.customStates(GALLERY_PROJECT_ID),
      STUB_CUSTOM_STATES,
    );
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <PageWrapper title="Workflow">
        <PmPageShell>
          <PmSection index={0} className="flex-1">
            <PmPanel solid className="p-4">
              <StatusesSettings projectId={GALLERY_PROJECT_ID} />
            </PmPanel>
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </QueryClientProvider>
  );
}
