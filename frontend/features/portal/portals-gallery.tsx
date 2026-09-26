"use client";

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

export const FAKE_INVITE_TOKEN = "FAKE-INV-0000-PORTALS-TEST-ONLY-DO-NOT-USE";

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

function GallerySection({
  caseId,
  label,
  children,
}: {
  caseId: string;
  label: string;
  children: React.ReactNode;
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
    </div>
  );
}
