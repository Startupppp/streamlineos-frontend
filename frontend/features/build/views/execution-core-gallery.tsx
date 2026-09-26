"use client";

import { useCallback, useState } from "react";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { SidebarSelectFields } from "@/features/build/ticket-details/sidebar-select-fields";
import { TriageRow } from "@/features/build/triage/triage-row";
import { CycleCard } from "@/features/build/cycles/cycle-card";
import { ModuleCard } from "@/features/build/modules/module-card";
import { EpicCard } from "@/features/build/epics/epic-card";
import type { KanbanTicket } from "@/features/build/shared/types";
import type { Ticket, Cycle, Module } from "@/types/projects";
import { Skeleton } from "@/components/ui/skeleton";

const STUB_STATUSES = [
  { id: 1, name: "TODO" },
  { id: 2, name: "IN_PROGRESS" },
  { id: 3, name: "IN_REVIEW" },
  { id: 4, name: "DONE" },
  { id: 5, name: "CANCELLED" },
];

const STUB_EPICS = [
  { id: 1, title: "Platform foundation" },
  { id: 2, title: "Analytics v2" },
];

const STUB_MODULES = [
  { id: 1, name: "Core" },
  { id: 2, name: "Billing" },
];

const STUB_CYCLES = [
  { id: 1, name: "Sprint 42", status: "active" },
  { id: 2, name: "Sprint 43", status: "planned" },
];

const STUB_TICKET: KanbanTicket & { id: number } = {
  id: 42,
  title: "Implement token-refresh flow for idle sessions",
  type: "STORY",
  status: "IN_PROGRESS",
  priority: "HIGH",
  ticketNumber: 42,
  sequenceId: "PROJ-42",
  points: 5,
  storyPoints: null,
  assigneeId: null,
  epicId: null,
  cycleId: null,
  moduleId: null,
  rank: "1000",
  dueDate: "2026-10-15",
  startDate: null,
  createdAt: "2026-09-01",
  updatedAt: "2026-09-20",
  assignees: [],
};

const STUB_TICKET_B: KanbanTicket & { id: number } = {
  ...STUB_TICKET,
  id: 43,
  title: "Add rate-limit error state to the onboarding wizard",
  ticketNumber: 43,
  sequenceId: "PROJ-43",
  status: "TODO",
  priority: "MEDIUM",
};

const STUB_TICKET_C: KanbanTicket & { id: number } = {
  ...STUB_TICKET,
  id: 44,
  title: "Expose cursor-based pagination for /api/tickets",
  ticketNumber: 44,
  sequenceId: "PROJ-44",
  status: "DONE",
  priority: "LOW",
};

const COLUMNS = [
  { status: "TODO", tickets: [STUB_TICKET_B, { ...STUB_TICKET, id: 45, title: "Sync assignee avatar in real-time", ticketNumber: 45, sequenceId: "PROJ-45", status: "TODO" }] },
  { status: "IN_PROGRESS", tickets: [STUB_TICKET, { ...STUB_TICKET, id: 46, title: "Debounce search on ticket board", ticketNumber: 46, sequenceId: "PROJ-46", status: "IN_PROGRESS" }] },
  { status: "IN_REVIEW", tickets: [{ ...STUB_TICKET, id: 47, title: "Add stale-while-revalidate for cycles hook", ticketNumber: 47, sequenceId: "PROJ-47", status: "IN_REVIEW" }] },
  { status: "DONE", tickets: [STUB_TICKET_C] },
  { status: "CANCELLED", tickets: [{ ...STUB_TICKET, id: 48, title: "Migrate legacy sort params", ticketNumber: 48, sequenceId: "PROJ-48", status: "CANCELLED", priority: "LOW" }] },
] as const;

const STUB_FULL_TICKET: Ticket = {
  id: 101,
  orgId: "org-1",
  title: "Add rate-limit error state to onboarding wizard",
  type: "STORY",
  status: "IN_PROGRESS",
  priority: "HIGH",
  projectId: 1,
  ticketNumber: 101,
  epicId: 1,
  reporterId: null,
  points: 5,
  storyPoints: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: null,
  moduleId: null,
  cycleId: null,
  sequenceId: "PROJ-101",
  estimate: null,
  createdAt: "2026-09-01",
  updatedAt: "2026-09-20",
};

const STUB_TRIAGE_TICKET_B: Ticket = {
  ...STUB_FULL_TICKET,
  id: 102,
  title: "Expose cursor-based pagination for /api/tickets",
  ticketNumber: 102,
  sequenceId: "PROJ-102",
  priority: "LOW",
  status: "TODO",
};

const STUB_CYCLE_ACTIVE: Cycle = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Sprint 42",
  description: null,
  status: "active",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  createdBy: "user-1",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
  totalItems: 8,
  completedItems: 5,
  progress: 62,
};

const STUB_CYCLE_PLANNED: Cycle = {
  ...STUB_CYCLE_ACTIVE,
  id: 2,
  name: "Sprint 43",
  status: "draft",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  completedItems: 0,
  progress: 0,
};

const STUB_MODULE_A: Module = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Core Platform",
  description: "Foundation services and authentication",
  status: "in-progress",
  leadId: null,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  createdBy: "user-1",
  createdAt: "2026-01-01",
  updatedAt: "2026-09-01",
  progress: 65,
};

const STUB_MODULE_B: Module = {
  ...STUB_MODULE_A,
  id: 2,
  name: "Billing Module",
  description: "Payment flows and subscription management",
  status: "planned",
  progress: 0,
};

const NOOP = () => undefined;

function GalleryCase({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`case-title-${id}`}>
      <h2 id={`case-title-${id}`} className="mb-2 text-sm font-semibold">
        {title}
      </h2>
      <div
        data-case-frame={id}
        className="w-full overflow-hidden rounded-xl border bg-background"
      >
        {children}
      </div>
    </section>
  );
}

function KanbanOverflowCase() {
  return (
    <GalleryCase id="kanban-board-overflow" title="Board — horizontal scroll in container, not page">
      <div
        data-testid="kanban-scroll-container"
        className="overflow-x-auto overflow-y-hidden"
        role="region"
        aria-label="Kanban board"
      >
        <div className="flex gap-3 p-4" style={{ minWidth: "max-content" }}>
          {COLUMNS.map(({ status, tickets }) => (
            <div
              key={status}
              className="w-64 rounded-xl border bg-muted/50 p-3"
              role="region"
              aria-label={`${status.replace(/_/g, " ")} column`}
            >
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {status.replace(/_/g, " ")}
              </div>
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <KanbanTicketCard
                    key={ticket.id}
                    ticket={ticket as KanbanTicket}
                    projectId={1}
                    projectKey="PROJ"
                    isDragging={false}
                    onSelect={NOOP}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </GalleryCase>
  );
}

function TicketDetailCase() {
  const [status, setStatus] = useState("IN_PROGRESS");
  const [priority, setPriority] = useState("HIGH");
  const stubTicket = { id: 42, status, priority, type: "STORY", points: 5, epicId: null, moduleId: null, cycleId: null };

  return (
    <GalleryCase id="ticket-detail-two-panel" title="Ticket detail — two-panel layout with real sidebar controls">
      <div className="flex min-h-[24rem] gap-0">
        <div className="flex min-w-0 flex-1 flex-col gap-3 border-r p-4">
          <div>
            <span className="font-mono text-xs text-muted-foreground">PROJ-42</span>
            <h3 className="text-base font-semibold">Implement token-refresh flow for idle sessions</h3>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Ticket description area. Long-form text describing the work item goes here.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-accent"
              aria-label="Edit ticket"
            >
              Edit
            </button>
            <button
              type="button"
              className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-accent"
              aria-label="Archive ticket"
            >
              Archive
            </button>
          </div>
        </div>
        <aside
          className="w-64 shrink-0 overflow-y-auto p-4"
          aria-label="Ticket metadata"
        >
          <SidebarSelectFields
            ticket={stubTicket}
            statuses={STUB_STATUSES}
            epics={STUB_EPICS}
            modules={STUB_MODULES}
            cycles={STUB_CYCLES}
            onStatusChange={setStatus}
            onPriorityChange={setPriority}
            onTypeChange={NOOP}
            onPointsChange={NOOP}
            onEpicChange={NOOP}
            onModuleChange={NOOP}
            onCycleChange={NOOP}
          />
        </aside>
      </div>
    </GalleryCase>
  );
}

function KanbanLoadingCase() {
  return (
    <GalleryCase id="kanban-board-loading" title="Board — loading skeleton">
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4" style={{ minWidth: "max-content" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-64 rounded-xl border bg-muted/50 p-3">
              <Skeleton className="mb-2 h-4 w-24" />
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="mb-2 h-14 rounded-xl" {...(i === 1 && j === 1 ? { 'data-testid': 'gallery-loading-skeleton' } : {})} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </GalleryCase>
  );
}

function TriageCase() {
  return (
    <GalleryCase id="triage-rows" title="Triage — accept / decline rows">
      <div className="space-y-2 p-4">
        <TriageRow
          ticket={STUB_FULL_TICKET}
          projectKey="PROJ"
          isAccepting={false}
          isDeclining={false}
          onAccept={NOOP}
          onDecline={NOOP}
          onOpen={NOOP}
          isSelected={false}
        />
        <TriageRow
          ticket={STUB_TRIAGE_TICKET_B}
          projectKey="PROJ"
          isAccepting={false}
          isDeclining={false}
          onAccept={NOOP}
          onDecline={NOOP}
          onOpen={NOOP}
          isSelected={false}
        />
      </div>
    </GalleryCase>
  );
}

function CycleCase() {
  return (
    <GalleryCase id="cycle-cards" title="Cycles — cycle cards">
      <div className="space-y-3 p-4">
        <CycleCard
          cycle={STUB_CYCLE_ACTIVE}
          projectId={1}
          canManage={false}
          onEdit={NOOP}
          onChangeStatus={NOOP}
          onPlan={NOOP}
          onComplete={NOOP}
          onDelete={NOOP}
        />
        <CycleCard
          cycle={STUB_CYCLE_PLANNED}
          projectId={1}
          canManage={true}
          onEdit={NOOP}
          onChangeStatus={NOOP}
          onPlan={NOOP}
          onComplete={NOOP}
          onDelete={NOOP}
        />
      </div>
    </GalleryCase>
  );
}

function ModuleCase() {
  return (
    <GalleryCase id="module-cards" title="Modules — module cards">
      <div className="grid grid-cols-2 gap-3 p-4">
        <ModuleCard module={STUB_MODULE_A} projectId={1} index={0} />
        <ModuleCard module={STUB_MODULE_B} projectId={1} index={1} />
      </div>
    </GalleryCase>
  );
}

function EpicCase() {
  return (
    <GalleryCase id="epic-card" title="Epics — epic card">
      <div className="p-4">
        <EpicCard
          epic={{ id: 1, title: "Platform Foundation Epic", status: "IN_PROGRESS", priority: "HIGH", description: "Foundation services, auth, and core data models." }}
          stories={[STUB_FULL_TICKET]}
          projectId={1}
          projectKey="PROJ"
          unlinkedStories={[]}
          onDeleteEpic={NOOP}
          onLinkStory={NOOP}
          onCreateStory={NOOP}
        />
      </div>
    </GalleryCase>
  );
}

export function ExecutionCoreGallery() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">
          Execution core surfaces
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Board/kanban overflow, ticket-detail layout, and control-height contracts.
          Rendered from real components with static stub data.
        </p>
      </header>

      <KanbanOverflowCase />
      <TicketDetailCase />
      <KanbanLoadingCase />
      <TriageCase />
      <CycleCase />
      <ModuleCase />
      <EpicCase />
    </div>
  );
}
