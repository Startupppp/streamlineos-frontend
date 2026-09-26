"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { AccessResponse } from "@/hooks/api/access-schema";
import type { IterationSettings } from "@/hooks/api/build/iteration-settings-schema";
import type { ProjectRetentionSettings } from "@/features/build/settings/project-settings-retention-schema";
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
import { ViewCard, type ViewItem } from "@/features/build/views/saved-views/view-card";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PmPanel } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { TokenRow } from "./agent-token-list";

function noop() {
  return undefined;
}

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

const STUB_RETENTION_SETTINGS: ProjectRetentionSettings = {
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
  },
  {
    id: 2,
    orgId: "org_gallery",
    projectId: GALLERY_PROJECT_ID,
    name: "Done",
    color: null,
    order: 2,
    type: "completed",
  },
  {
    id: 3,
    orgId: "org_gallery",
    projectId: GALLERY_PROJECT_ID,
    name: "Todo",
    color: null,
    order: 3,
    type: "unstarted",
  },
];

const STATIC_VIEWS: ViewItem[] = [
  { id: 1, name: "Engineering backlog", layoutType: "list", isPinned: true, createdBy: "user_a", filters: null },
  { id: 2, name: "Sprint board", layoutType: "board", isPinned: false, createdBy: "user_b", filters: null },
  { id: 3, name: "Roadmap calendar", layoutType: "calendar", isPinned: false, createdBy: "user_a", filters: null },
  { id: 4, name: "Release tracker", layoutType: "table", isPinned: true, createdBy: "user_b", filters: null },
];

function IterationsReadyFrame() {
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

function RetentionReadyFrame() {
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

function FieldsReadyFrame() {
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

function AgentsReadyFrame() {
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

function IntegrationsReadyFrame() {
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

function AutomationsReadyFrame() {
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

function WorkflowReadyFrame() {
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

export function SettingsGallery() {
  return (
    <>
      <h1>Settings surfaces</h1>
      <div className="flex flex-col gap-8 p-6">
        <GalleryCase id="settings-views-ready" title="Views — ready state">
          <PageWrapper
            title="Saved Views"
            filters={
              <BuildListToolbar
                search={{ value: "", onValueChange: noop, placeholder: "Search views…" }}
              />
            }
          >
            <PmPageShell>
              <PmSection index={0} className="flex-1">
                <PmPanel solid className="flex min-h-0 flex-col p-2">
                  {STATIC_VIEWS.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned={view.isPinned}
                      currentUserId="user_a"
                      onNavigate={noop}
                      onTogglePin={noop}
                      onRename={noop}
                      onDelete={noop}
                      canManage={true}
                    />
                  ))}
                </PmPanel>
              </PmSection>
            </PmPageShell>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-loading" title="Views — loading skeleton">
          <PageWrapper title="Saved Views">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-empty" title="Views — empty state">
          <PageWrapper title="Saved Views">
            <EmptyState title="No saved views yet" />
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-views-denied" title="Views — access denied">
          <PageWrapper title="Saved Views">
            <NoPermissionState />
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-loading" title="Project settings — loading skeleton">
          <PageWrapper title="Project settings">
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-access-loading" title="Access — loading skeleton">
          <PageWrapper title="Access">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-agents-loading" title="Agents — loading skeleton">
          <PageWrapper title="Agents">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-agents-ready" title="Agents — ready state">
          <AgentsReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-automations-loading" title="Automations — loading skeleton">
          <PageWrapper title="Automations">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-automations-ready" title="Automations — ready state">
          <AutomationsReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-fields-loading" title="Fields — loading skeleton">
          <PageWrapper title="Fields">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-fields-ready" title="Fields — ready state">
          <FieldsReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-integrations-loading" title="Integrations — loading skeleton">
          <PageWrapper title="Integrations">
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-integrations-ready" title="Integrations — ready state">
          <IntegrationsReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-webhooks-loading" title="Webhooks — loading skeleton">
          <PageWrapper title="Webhooks">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-iterations-loading" title="Iterations — loading skeleton">
          <PageWrapper title="Iterations">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-iterations-ready" title="Iterations — ready state">
          <IterationsReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-portal-loading" title="Portal — loading skeleton">
          <PageWrapper title="Portal">
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-retention-loading" title="Retention — loading skeleton">
          <PageWrapper title="Retention">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-retention-ready" title="Retention — ready state">
          <RetentionReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-project-workflow-loading" title="Workflow — loading skeleton">
          <PageWrapper title="Workflow">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-project-workflow-ready" title="Workflow — ready state (status rows)">
          <WorkflowReadyFrame />
        </GalleryCase>

        <GalleryCase id="settings-org-access-loading" title="Org access settings — loading skeleton">
          <PageWrapper title="Access">
            <div className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-org-integrations-loading" title="Org integrations settings — loading skeleton">
          <PageWrapper title="Integrations">
            <div className="space-y-4 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </PageWrapper>
        </GalleryCase>

        <GalleryCase id="settings-credentials-token-list" title="Credentials — token list (secret-redaction stub)">
          <PageWrapper title="Credentials">
            <PmPageShell>
              <PmSection index={0}>
                <PmPanel className="p-4" solid>
                  <TokenRow
                    token={{
                      id: 99,
                      name: "CI bot",
                      tokenPrefix: "slat_Fa9c",
                      scopes: ["build:read"],
                      createdAt: "2026-01-01T00:00:00Z",
                      expiresAt: null,
                      lastUsedAt: null,
                      revokedAt: null,
                    }}
                    onRevoke={noop}
                  />
                </PmPanel>
              </PmSection>
            </PmPageShell>
          </PageWrapper>
        </GalleryCase>
      </div>
    </>
  );
}
