"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  PortalProjectDetailLoading,
  PortalProjectDetailError,
  PortalProjectDetailNotFound,
  PortalProjectDetail,
  PortalProjectDetailShell,
} from "@/features/portal/components/portal-project-detail";
import { PortalProjectCard } from "@/features/portal/components/portal-project-card";
import {
  LoadingView as InviteLoadingView,
  ErrorView as InviteErrorView,
  MissingTokenView,
} from "@/app/(portal)/accept-invitation/page";
import type {
  PortalProject,
  PortalProjectOverview,
} from "@/features/portal/lib/portal-types";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { PortalListPage } from "@/features/build/client-portal/portal-list-page";
import { PortalDashboardPage } from "@/features/build/client-portal/portal-dashboard-page";
import { ChangeRequestsPage } from "@/features/build/change-requests/change-requests-page";
import { ClientVisibilityPage } from "@/features/build/client-portal/client-visibility-page";
import { UpdatesPage } from "@/features/build/updates/updates-page";
import { ClientAccessPage } from "@/features/portal-access/client-access-page";

export const FAKE_INVITE_TOKEN = "FAKE-INV-0000-PORTALS-TEST-ONLY-DO-NOT-USE";

const INTERNAL_PROJECT_ID = 101;

const STUB_PROJECT: PortalProject = {
  id: 101,
  name: "Northbridge Redesign",
  key: "NBR",
  status: "active",
  description: "Full redesign of the Northbridge client-facing portal.",
  startDate: "2026-01-15",
  targetEndDate: "2026-12-31",
  capabilities: {
    canViewMilestones: true,
    canViewTasks: true,
    canViewAttachments: false,
    canViewComments: true,
    canSubmitChangeRequests: true,
  },
};

const STUB_OVERVIEW: PortalProjectOverview = {
  project: STUB_PROJECT,
  capabilities: STUB_PROJECT.capabilities,
  milestones: [
    { id: 1, name: "Discovery complete", dueDate: "2026-03-01", status: "done" },
    { id: 2, name: "Design handoff", dueDate: "2026-06-15", status: "in_progress" },
    { id: 3, name: "Beta launch", dueDate: "2026-10-01", status: "todo" },
  ],
  tasks: [
    {
      id: 10,
      ticketNumber: 42,
      title: "Audit current navigation flow",
      status: "done",
      dueDate: null,
      assigneeName: "Jordan A.",
    },
    {
      id: 11,
      ticketNumber: 43,
      title: "Implement token-refresh for idle sessions",
      status: "in_progress",
      dueDate: "2026-07-01",
      assigneeName: null,
    },
  ],
  attachments: [],
  comments: [
    {
      id: 5,
      body: "Discovery phase complete — ready for design review.",
      authorName: "Sam O.",
      createdAt: "2026-05-10T09:00:00Z",
    },
  ],
};

const STUB_ACCESS = {
  scopes: {} as Record<string, "all" | "team" | "own" | "none">,
  isOrgOwner: true,
  canManageOrganizationMembership: true,
  modules: { build: true } as Record<string, boolean>,
  membershipId: null,
};

const STUB_CP_PROJECTS = [
  { id: 101, name: "Northbridge Redesign", key: "NBR", status: "active", color: null, startDate: "2026-01-15", targetEndDate: "2026-12-31" },
  { id: 102, name: "Southfield Platform", key: "SFP", status: "in_progress", color: null, startDate: "2026-02-01", targetEndDate: "2026-11-30" },
];

const STUB_CP_OVERVIEW = {
  project: { id: 101, name: "Northbridge Redesign", key: "NBR", status: "active", startDate: "2026-01-15", targetEndDate: "2026-12-31" },
  milestones: [
    { id: 1, name: "Discovery complete", dueDate: "2026-03-01", status: "done" },
    { id: 2, name: "Beta launch", dueDate: "2026-10-01", status: "in_progress" },
  ],
  tasks: [
    { id: 10, ticketNumber: 42, title: "Audit navigation flow", status: "done", dueDate: null },
    { id: 11, ticketNumber: 43, title: "Token-refresh for idle sessions", status: "in_progress", dueDate: "2026-07-01" },
  ],
  attachments: [],
  comments: [{ id: 5, body: "Discovery phase complete.", authorName: "Sam O.", createdAt: "2026-05-10T09:00:00Z" }],
};

const STUB_PORTAL_CRS = [
  { id: 1, crNumber: 1, title: "Expand dashboard scope", description: null, impact: null, status: "submitted", estimateMinutes: null, budgetImpactCents: null, timelineImpactDays: null, decisionComment: null, createdAt: "2026-06-01T10:00:00Z" },
];

const STUB_CR_PAGE = {
  data: [
    { id: 1, orgId: "gallery-org", projectId: 101, crNumber: 1, title: "Expand scope to include mobile", description: null, impact: "medium", estimateMinutes: null, budgetImpactCents: null, timelineImpactDays: null, status: "submitted" as const, requestedById: null, approvalOwnerId: null, approvalOwnerMembershipId: null, decisionComment: null, decidedAt: null, releaseId: null, clientVisible: true, createdBy: null, createdAt: "2026-06-01T10:00:00Z", updatedAt: "2026-06-01T10:00:00Z", deletedAt: null },
    { id: 2, orgId: "gallery-org", projectId: 101, crNumber: 2, title: "Add milestone export to PDF", description: null, impact: "low", estimateMinutes: null, budgetImpactCents: null, timelineImpactDays: null, status: "approved" as const, requestedById: null, approvalOwnerId: null, approvalOwnerMembershipId: null, decisionComment: null, decidedAt: null, releaseId: null, clientVisible: false, createdBy: null, createdAt: "2026-06-10T10:00:00Z", updatedAt: "2026-06-10T10:00:00Z", deletedAt: null },
  ],
  pagination: { limit: 25, hasMore: false, nextCursor: null },
};

const STUB_TICKETS_PAGE = {
  data: [
    { id: 1, ticketNumber: 42, title: "Audit navigation flow", type: "task", clientVisible: true },
    { id: 2, ticketNumber: 43, title: "Token refresh for idle sessions", type: "bug", clientVisible: false },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

const STUB_MILESTONES_PAGE = {
  data: [
    { id: 1, name: "Discovery complete", clientVisible: true },
    { id: 2, name: "Beta launch", clientVisible: false },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

const STUB_UPDATE_PAGE = {
  data: [
    { id: 1, orgId: "gallery-org", projectId: 101, authorMembershipId: 1, authorName: "Jordan A.", body: "Week 24 update: discovery phase complete, handoff meeting scheduled for Monday.", wins: null, risks: null, next: null, citations: null, status: "published" as const, audience: "internal" as const, createdAt: "2026-06-10T09:00:00Z", updatedAt: "2026-06-10T09:00:00Z", deletedAt: null },
    { id: 2, orgId: "gallery-org", projectId: 101, authorMembershipId: 1, authorName: "Sam O.", body: "Beta testing underway, collecting feedback from client stakeholders.", wins: null, risks: null, next: null, citations: null, status: "published" as const, audience: "client" as const, createdAt: "2026-06-17T09:00:00Z", updatedAt: "2026-06-17T09:00:00Z", deletedAt: null },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

const STUB_GRANTS_PAGE = {
  data: [
    { projectClientGrantId: "grant-001", organizationId: "gallery-org", portalMembershipId: "mem-001", partyContactId: "contact-001", projectId: 101, canViewMilestones: true, canViewTasks: true, canViewAttachments: false, canViewComments: true, canSubmitChangeRequests: false, status: "ACTIVE" as const, expiresAt: null, createdAt: "2026-05-01T00:00:00Z", updatedAt: "2026-05-01T00:00:00Z", contactFirstName: "Alice", contactLastName: "Northbridge" },
    { projectClientGrantId: "grant-002", organizationId: "gallery-org", portalMembershipId: "mem-002", partyContactId: "contact-002", projectId: 102, canViewMilestones: false, canViewTasks: true, canViewAttachments: false, canViewComments: false, canSubmitChangeRequests: true, status: "ACTIVE" as const, expiresAt: null, createdAt: "2026-05-15T00:00:00Z", updatedAt: "2026-05-15T00:00:00Z", contactFirstName: "Bob", contactLastName: "Southfield" },
  ],
  pagination: { limit: 20, nextCursor: null, hasMore: false },
};

function useInternalGalleryQueryClient() {
  const [client] = useState(() => {
    const qc = createAppQueryClient("portals-internal-gallery");

    qc.setQueryData(platformCoreQueryKeys.access.me(), STUB_ACCESS);

    qc.setQueryData(buildWorkQueryKeys.projects.clientPortal.projects(), STUB_CP_PROJECTS);

    qc.setQueryData(buildWorkQueryKeys.projects.clientPortal.overview(INTERNAL_PROJECT_ID), STUB_CP_OVERVIEW);

    qc.setQueryData(buildWorkQueryKeys.projects.clientPortal.changeRequests(INTERNAL_PROJECT_ID), STUB_PORTAL_CRS);

    qc.setQueryData(
      buildWorkQueryKeys.projects.changeRequests.list(INTERNAL_PROJECT_ID),
      STUB_CR_PAGE,
    );

    qc.setQueryData(
      buildWorkQueryKeys.projects.updates.list(INTERNAL_PROJECT_ID),
      { pages: [STUB_UPDATE_PAGE], pageParams: [undefined] },
    );

    qc.setQueryData(
      [...buildWorkQueryKeys.projects.clientPortal.visibility(INTERNAL_PROJECT_ID), "tickets-infinite"],
      { pages: [STUB_TICKETS_PAGE], pageParams: [undefined] },
    );

    qc.setQueryData(
      [...buildWorkQueryKeys.projects.clientPortal.visibility(INTERNAL_PROJECT_ID), "milestones-infinite"],
      { pages: [STUB_MILESTONES_PAGE], pageParams: [undefined] },
    );

    qc.setQueryData(
      directoryAndOwnershipQueryKeys.portalAccess.grants({
        cursor: undefined,
        limit: 20,
        q: undefined,
        state: undefined,
        permission: undefined,
      }),
      STUB_GRANTS_PAGE,
    );

    return qc;
  });
  return client;
}

function GallerySection({
  caseId,
  label,
  children,
}: {
  caseId: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-mono text-muted-foreground px-1">{label}</p>
      <div data-case-frame={caseId} className="border border-dashed border-border rounded-xl overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function InternalPortalSections() {
  const queryClient = useInternalGalleryQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Internal portal — /portal</h2>
        <GallerySection caseId="internal-portal-list" label="internal-portal-list — PortalListPage ready (2 projects)">
          <div className="h-[28rem] overflow-hidden">
            <PortalListPage />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Internal portal — /portal/[projectId]</h2>
        <GallerySection caseId="internal-portal-dashboard" label="internal-portal-dashboard — PortalDashboardPage ready (project 101)">
          <div className="h-[40rem] overflow-hidden">
            <PortalDashboardPage projectId={INTERNAL_PROJECT_ID} />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Change requests — /build/[projectId]/change-requests</h2>
        <GallerySection caseId="internal-change-requests" label="internal-change-requests — ChangeRequestsPage ready (2 rows)">
          <div className="h-[36rem] overflow-hidden">
            <ChangeRequestsPage projectId={INTERNAL_PROJECT_ID} />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Client visibility — /build/[projectId]/client-portal</h2>
        <GallerySection caseId="internal-client-visibility" label="internal-client-visibility — ClientVisibilityPage ready (tickets tab)">
          <div className="h-[32rem] overflow-hidden">
            <ClientVisibilityPage projectId={INTERNAL_PROJECT_ID} />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Updates — /build/[projectId]/updates</h2>
        <GallerySection caseId="internal-updates" label="internal-updates — UpdatesPage ready (2 updates)">
          <div className="h-[28rem] overflow-hidden">
            <UpdatesPage projectId={INTERNAL_PROJECT_ID} />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Client access settings — /build/settings/client-access</h2>
        <GallerySection caseId="internal-client-access" label="internal-client-access — ClientAccessPage ready (2 grants)">
          <div className="h-[32rem] overflow-hidden">
            <ClientAccessPage />
          </div>
        </GallerySection>
      </div>
    </QueryClientProvider>
  );
}

export function PortalsGallery() {
  return (
    <div className="p-6 space-y-10 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">Portal surfaces</h1>
        <p className="text-sm text-muted-foreground">
          Real portal components mounted with stub data. Browser checks: 375 / 768 / 1280 px, keyboard navigation, reduced-motion, screen-reader.
        </p>
      </header>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Project card</h2>
        <GallerySection caseId="portal-project-card" label="portal-project-card — ready">
          <div className="p-4">
            <PortalProjectCard project={STUB_PROJECT} />
          </div>
        </GallerySection>
        <GallerySection caseId="portal-project-card-minimal" label="portal-project-card — minimal (no capabilities)">
          <div className="p-4">
            <PortalProjectCard
              project={{ ...STUB_PROJECT, capabilities: undefined, description: null }}
            />
          </div>
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Project detail</h2>
        <GallerySection caseId="portal-detail-loading" label="portal-detail — loading">
          <PortalProjectDetailLoading />
        </GallerySection>
        <GallerySection caseId="portal-detail-error" label="portal-detail — server error">
          <PortalProjectDetailError onRetry={() => undefined} />
        </GallerySection>
        <GallerySection caseId="portal-detail-not-found" label="portal-detail — not found / denied">
          <PortalProjectDetailNotFound />
        </GallerySection>
        <GallerySection caseId="portal-detail-ready" label="portal-detail — ready with milestones, tasks, comments">
          <PortalProjectDetailShell>
            <PortalProjectDetail data={STUB_OVERVIEW} />
          </PortalProjectDetailShell>
        </GallerySection>
        <GallerySection caseId="portal-detail-empty" label="portal-detail — ready with empty collections">
          <PortalProjectDetail
            data={{
              ...STUB_OVERVIEW,
              milestones: [],
              tasks: [],
              attachments: [],
              comments: [],
            }}
          />
        </GallerySection>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Invitation acceptance</h2>
        <GallerySection
          caseId="portal-invite-accept"
          label="portal-invite-accept — loading (real StatusLayout+PortalHeader; token in data-attr, not in text)"
        >
          <div data-invite-token={FAKE_INVITE_TOKEN}>
            <InviteLoadingView />
          </div>
        </GallerySection>
        <GallerySection
          caseId="portal-invite-accept-error"
          label="portal-invite-accept — error (real ErrorView with contact-support link)"
        >
          <InviteErrorView
            title="Could not accept invitation"
            message="There was a problem verifying this invitation. Please try again or contact support."
          />
        </GallerySection>
        <GallerySection
          caseId="portal-invite-accept-missing-token"
          label="portal-invite-accept — expired session (real MissingTokenView)"
        >
          <MissingTokenView reason="expired" />
        </GallerySection>
      </div>

      <InternalPortalSections />
    </div>
  );
}
