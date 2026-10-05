"use client";

import { ViewCard } from "@/features/build/views/saved-views/view-card";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection, PmPanel } from "@/components/pm-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { noop, STATIC_VIEWS, IterationsReadyFrame, RetentionReadyFrame, FieldsReadyFrame, AgentsReadyFrame, IntegrationsReadyFrame, AutomationsReadyFrame, WorkflowReadyFrame } from "./settings-gallery-frames";
import { SettingsGalleryOrgSection } from "./settings-gallery-org-cases";

export function SettingsGallery() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <GalleryCase id="settings-views-ready" title="Views — ready state">
        <PageWrapper
          title="Saved Views"
          filters={
            <BuildListToolbar
              search={{
                value: "",
                onValueChange: noop,
                placeholder: "Search views…",
              }}
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

      <GalleryCase
        id="settings-project-loading"
        title="Project settings — loading skeleton"
      >
        <PageWrapper title="Project settings">
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-access-loading"
        title="Access — loading skeleton"
      >
        <PageWrapper title="Access">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-agents-loading"
        title="Agents — loading skeleton"
      >
        <PageWrapper title="Agents">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-agents-ready"
        title="Agents — ready state"
      >
        <AgentsReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-automations-loading"
        title="Automations — loading skeleton"
      >
        <PageWrapper title="Automations">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-automations-ready"
        title="Automations — ready state"
      >
        <AutomationsReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-fields-loading"
        title="Fields — loading skeleton"
      >
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

      <GalleryCase
        id="settings-project-fields-ready"
        title="Fields — ready state"
      >
        <FieldsReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-integrations-loading"
        title="Integrations — loading skeleton"
      >
        <PageWrapper title="Integrations">
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-integrations-ready"
        title="Integrations — ready state"
      >
        <IntegrationsReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-webhooks-loading"
        title="Webhooks — loading skeleton"
      >
        <PageWrapper title="Webhooks">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-iterations-loading"
        title="Iterations — loading skeleton"
      >
        <PageWrapper title="Iterations">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-iterations-ready"
        title="Iterations — ready state"
      >
        <IterationsReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-portal-loading"
        title="Portal — loading skeleton"
      >
        <PageWrapper title="Portal">
          <div className="space-y-4 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-retention-loading"
        title="Retention — loading skeleton"
      >
        <PageWrapper title="Retention">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-retention-ready"
        title="Retention — ready state"
      >
        <RetentionReadyFrame />
      </GalleryCase>

      <GalleryCase
        id="settings-project-workflow-loading"
        title="Workflow — loading skeleton"
      >
        <PageWrapper title="Workflow">
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </PageWrapper>
      </GalleryCase>

      <GalleryCase
        id="settings-project-workflow-ready"
        title="Workflow — ready state (status rows)"
      >
        <WorkflowReadyFrame />
      </GalleryCase>

      <SettingsGalleryOrgSection />
    </div>
  );
}
