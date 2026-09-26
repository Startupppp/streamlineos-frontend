"use client";

import { useCallback, useRef, useState } from "react";
import { TemplateCard } from "@/features/build/templates/template-card";
import { TemplatesGridSkeleton } from "@/features/build/templates/templates-grid-skeleton";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import type { ProjectTemplate } from "@/hooks/api/build";
import {
  AllWorkSkeleton,
  AllWorkViewSwitcher,
  type AllWorkView,
} from "@/features/build/all-work/all-work-view-switcher";
import { DataTableSkeleton } from "@/components/ui/data-table";
import {
  ApprovalsInboxMobileCard,
  DecideButtonCell,
  INBOX_TABLE_HEADERS,
} from "@/features/build/approvals/approvals-inbox-columns";
import type { ApprovalInboxItem } from "@/types/projects";
import { MyWorkRow } from "@/features/build/command-center/command-center-rows";
import type { MyWorkItem } from "@/types/projects/my-work";
import { InboxListSkeleton } from "@/features/build/inbox/inbox-list-skeleton";
import { InboxNotificationItem } from "@/features/build/inbox/inbox-notification-item";
import type { Notification } from "@/types/notifications";
import {
  AllWorkListSkeleton,
  WorkItemRow,
} from "@/features/build/my-work/my-work-rows";
import { GridSkeleton } from "@/features/build/project-list/projects-page-skeletons";
import { ProjectCard } from "@/features/build/project-list/project-card";
import type { ProjectListItem } from "@/types/projects/projects";
import {
  TeamMobileCard,
  TeamRowActions,
} from "@/features/build/teams/team-table-columns";
import type { ProjectTeam } from "@/types/projects";

const STUB_TEMPLATES: ProjectTemplate[] = [
  {
    id: 1,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Sprint Planning",
    description: "Two-week sprint with backlog grooming, daily standups, review and retrospective.",
    category: "ENGINEERING",
    tickets: [
      { id: 11, templateId: 1, title: "Set sprint goal", description: null, type: "TASK", priority: "HIGH", estimatedHours: null, order: 0, phase: "Setup" },
    ],
  },
  {
    id: 2,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Bug Bash",
    description: "Focused bug discovery sprint with triaged outcomes and automated regression coverage.",
    category: "QUALITY",
    tickets: [],
  },
  {
    id: 3,
    orgId: "org_gallery",
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Feature Launch",
    description: "End-to-end feature delivery from discovery to production rollout.",
    category: "PRODUCT",
    tickets: [],
  },
];

const STUB_APPROVALS: ApprovalInboxItem[] = [
  { id: 1, projectId: 1, projectName: "StreamlineOS", projectKey: "SL", entityType: "task", entityId: 101, title: "Approve quarterly budget allocation", status: "pending", level: 1, dueAt: "2026-12-31", requestedById: "user_1", decidedAt: null },
  { id: 2, projectId: 1, projectName: "StreamlineOS", projectKey: "SL", entityType: "milestone", entityId: 202, title: "Sign off on release 2.0 scope", status: "requested", level: 1, dueAt: null, requestedById: "user_2", decidedAt: null },
  { id: 3, projectId: 2, projectName: "Platform", projectKey: "PL", entityType: "change_request", entityId: 303, title: "Authorise database schema change", status: "escalated", level: 2, dueAt: "2026-11-15", requestedById: "user_3", decidedAt: null },
];

const STUB_MY_WORK: MyWorkItem[] = [
  { id: 1, projectId: 1, projectName: "StreamlineOS", projectKey: "SL", ticketNumber: 42, title: "Review spec changes for approval flow", status: "IN_PROGRESS", priority: "HIGH", type: "TASK", dueDate: "2026-12-31" },
  { id: 2, projectId: 1, projectName: "StreamlineOS", projectKey: "SL", ticketNumber: 87, title: "Fix pagination cursor off-by-one", status: "TODO", priority: "NORMAL", type: "BUG", dueDate: null },
  { id: 3, projectId: 2, projectName: "Platform", projectKey: "PL", ticketNumber: 14, title: "Add dark-mode token for status-danger", status: "TODO", priority: "LOW", type: "TASK", dueDate: null },
];

const STUB_NOTIFICATIONS: Notification[] = [
  { id: 1, orgId: "org_gallery", userId: "user_1", type: "INFO", priority: "NORMAL", category: "PROJECTS", sourceModule: "build", title: "Alice mentioned you in SL-42", message: "Please review the acceptance criteria before the deadline.", link: null, isRead: false, pinned: false, channel: "IN_APP", ticketContext: null, archivedAt: null, snoozedUntil: null, createdAt: new Date().toISOString() },
  { id: 2, orgId: "org_gallery", userId: "user_1", type: "SUCCESS", priority: "NORMAL", category: "PROJECTS", sourceModule: "build", title: "SL-87 was resolved and merged", message: null, link: null, isRead: true, pinned: false, channel: "IN_APP", ticketContext: null, archivedAt: null, snoozedUntil: null, createdAt: new Date().toISOString() },
  { id: 3, orgId: "org_gallery", userId: "user_1", type: "WARNING", priority: "HIGH", category: "PROJECTS", sourceModule: "build", title: "Approval SL-101 is overdue", message: "The quarterly budget approval has passed its due date.", link: null, isRead: false, pinned: false, channel: "IN_APP", ticketContext: null, archivedAt: null, snoozedUntil: null, createdAt: new Date().toISOString() },
];

const STUB_PROJECTS: ProjectListItem[] = [
  { id: 1, name: "StreamlineOS", description: "Main product platform for HR and project management.", key: "SL", status: "ACTIVE", priority: null, health: "on_track", managedProductId: null, startDate: "2026-01-01", endDate: "2026-12-31", manager: null, progress: { total: 40, done: 30, percentage: 75 }, members: [], teams: [] },
  { id: 2, name: "Platform Services", description: "Shared infrastructure and integrations.", key: "PL", status: "ACTIVE", priority: null, health: "at_risk", managedProductId: null, startDate: "2026-03-01", endDate: null, manager: null, progress: { total: 20, done: 8, percentage: 40 }, members: [], teams: [] },
  { id: 3, name: "Design System", description: null, key: "DS", status: "ACTIVE", priority: null, health: "on_track", managedProductId: null, startDate: null, endDate: null, manager: null, progress: { total: 0, done: 0, percentage: 0 }, members: [], teams: [] },
];

const STUB_TEAMS: ProjectTeam[] = [
  { id: 1, orgId: "org_gallery", name: "Engineering", key: "ENG", icon: null, color: null, isPrivate: false, createdAt: "2026-01-01", updatedAt: "2026-01-01", memberCount: 8 },
  { id: 2, orgId: "org_gallery", name: "Product", key: "PD", icon: null, color: null, isPrivate: false, createdAt: "2026-01-01", updatedAt: "2026-01-01", memberCount: 4 },
  { id: 3, orgId: "org_gallery", name: "Design", key: "DX", icon: null, color: null, isPrivate: false, createdAt: "2026-01-01", updatedAt: "2026-01-01", memberCount: 3 },
];

const STUB_WORK_ITEMS = [
  { id: 1, projectId: 1, projectKey: "SL", projectName: "StreamlineOS", ticketNumber: 42, title: "Review spec changes for approval flow", status: "IN_PROGRESS", priority: "HIGH", type: "TASK", dueDate: "2026-12-31" },
  { id: 2, projectId: 1, projectKey: "SL", projectName: "StreamlineOS", ticketNumber: 87, title: "Fix pagination cursor off-by-one", status: "TODO", priority: "NORMAL", type: "BUG", dueDate: null },
  { id: 3, projectId: 2, projectKey: "PL", projectName: "Platform Services", ticketNumber: 14, title: "Add dark-mode token for status-danger", status: "TODO", priority: null, type: "TASK", dueDate: null },
];

function NOOP() {}
function NOOP_DECIDE(_item: ApprovalInboxItem) {}
function NOOP_SELECT(_notification: Notification) {}
function NOOP_TEAM_EDIT(_team: ProjectTeam) {}
function NOOP_TEAM_DELETE(_team: ProjectTeam) {}

function TemplatesKeyboardCase() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState<number | null>(null);

  const handleKeyboardOpen = useCallback((index: number) => {
    setFocused(index);
  }, []);

  const handleKeyboardClear = useCallback(() => {
    setFocused(null);
  }, []);

  useBuildListKeyboard({
    itemCount: STUB_TEMPLATES.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef: searchRef,
    enabled: true,
  });

  return (
    <section data-case-frame="templates-grid-keyboard" className="flex min-h-0 flex-col gap-3">
      {focused !== null ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Focused: {STUB_TEMPLATES[focused]?.name ?? ""}
        </p>
      ) : null}
      <div
        role="list"
        aria-label="Project templates"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STUB_TEMPLATES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onApply={NOOP}
            onDelete={NOOP}
          />
        ))}
      </div>
    </section>
  );
}

function AllWorkKeyboardCase() {
  const [view, setView] = useState<AllWorkView>("list");
  return (
    <section data-case-frame="all-work-keyboard" className="flex min-h-0 flex-col gap-3">
      <AllWorkViewSwitcher activeView={view} onViewChange={setView} />
    </section>
  );
}

function ApprovalsKeyboardCase() {
  return (
    <section data-case-frame="approvals-keyboard" className="flex min-h-0 flex-col gap-3">
      <div role="list" aria-label="Pending approvals">
        {STUB_APPROVALS.map((row) => (
          <div key={row.id} role="listitem" className="flex items-center justify-between gap-2 border-b border-border py-2">
            <ApprovalsInboxMobileCard row={row} ownerOf={() => null} />
            <DecideButtonCell row={row} onDecide={NOOP_DECIDE} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CommandCenterKeyboardCase() {
  return (
    <section data-case-frame="command-center-keyboard" className="flex min-h-0 flex-col gap-1">
      {STUB_MY_WORK.map((item) => (
        <MyWorkRow key={item.id} item={item} />
      ))}
    </section>
  );
}

function InboxKeyboardCase() {
  return (
    <section data-case-frame="inbox-keyboard" className="flex min-h-0 flex-col">
      {STUB_NOTIFICATIONS.map((n) => (
        <InboxNotificationItem
          key={n.id}
          notification={n}
          isSelected={false}
          isSelectable={false}
          onSelect={NOOP_SELECT}
        />
      ))}
    </section>
  );
}

function MyWorkKeyboardCase() {
  return (
    <section data-case-frame="my-work-keyboard" className="flex min-h-0 flex-col gap-1">
      {STUB_WORK_ITEMS.map((item) => (
        <WorkItemRow key={item.id} item={item} />
      ))}
    </section>
  );
}

function OrgProjectsKeyboardCase() {
  return (
    <section data-case-frame="org-projects-keyboard" className="flex min-h-0 flex-col gap-3">
      <div
        role="list"
        aria-label="Projects"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STUB_PROJECTS.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  );
}

function TeamsKeyboardCase() {
  return (
    <section data-case-frame="teams-keyboard" className="flex min-h-0 flex-col gap-2">
      <div role="list" aria-label="Teams">
        {STUB_TEAMS.map((team) => (
          <div key={team.id} role="listitem" className="flex items-center justify-between gap-2 border-b border-border py-2">
            <div className="min-w-0 flex-1">
              <TeamMobileCard
                team={team}
                canManage={true}
                onEdit={NOOP_TEAM_EDIT}
                onDelete={NOOP_TEAM_DELETE}
              />
            </div>
            <TeamRowActions
              team={team}
              onEdit={NOOP_TEAM_EDIT}
              onDelete={NOOP_TEAM_DELETE}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function OrgWorkGallery() {
  return (
    <div className="flex flex-col gap-10 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Org-work surfaces
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keyboard, screen-reader, reduced-motion, 375 px mobile and high-density desktop checks for all eight org-work pages.
        </p>
      </header>

      <section aria-labelledby="gallery-templates">
        <h2 id="gallery-templates" className="mb-4 text-sm font-semibold">Templates</h2>
        <TemplatesKeyboardCase />
        <section data-case-frame="templates-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <TemplatesGridSkeleton />
        </section>
      </section>

      <section aria-labelledby="gallery-all-work">
        <h2 id="gallery-all-work" className="mb-4 text-sm font-semibold">All Work</h2>
        <AllWorkKeyboardCase />
        <section data-case-frame="all-work-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <AllWorkSkeleton view="list" />
        </section>
      </section>

      <section aria-labelledby="gallery-approvals">
        <h2 id="gallery-approvals" className="mb-4 text-sm font-semibold">Approvals</h2>
        <ApprovalsKeyboardCase />
        <section data-case-frame="approvals-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <DataTableSkeleton headers={INBOX_TABLE_HEADERS} rows={6} />
        </section>
      </section>

      <section aria-labelledby="gallery-command-center">
        <h2 id="gallery-command-center" className="mb-4 text-sm font-semibold">Command Center</h2>
        <CommandCenterKeyboardCase />
        <section data-case-frame="command-center-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <DataTableSkeleton columns={5} rows={8} />
        </section>
      </section>

      <section aria-labelledby="gallery-inbox">
        <h2 id="gallery-inbox" className="mb-4 text-sm font-semibold">Inbox</h2>
        <InboxKeyboardCase />
        <section data-case-frame="inbox-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <InboxListSkeleton />
        </section>
      </section>

      <section aria-labelledby="gallery-my-work">
        <h2 id="gallery-my-work" className="mb-4 text-sm font-semibold">My Work</h2>
        <MyWorkKeyboardCase />
        <section data-case-frame="my-work-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <AllWorkListSkeleton />
        </section>
      </section>

      <section aria-labelledby="gallery-org-projects">
        <h2 id="gallery-org-projects" className="mb-4 text-sm font-semibold">Org Projects</h2>
        <OrgProjectsKeyboardCase />
        <section data-case-frame="org-projects-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <GridSkeleton />
        </section>
      </section>

      <section aria-labelledby="gallery-teams">
        <h2 id="gallery-teams" className="mb-4 text-sm font-semibold">Teams</h2>
        <TeamsKeyboardCase />
        <section data-case-frame="teams-loading" className="mt-4 flex min-h-0 flex-col gap-3">
          <DataTableSkeleton columns={4} rows={8} />
        </section>
      </section>
    </div>
  );
}
