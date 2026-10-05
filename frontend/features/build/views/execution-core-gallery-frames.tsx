"use client";

import { useState } from "react";
import { KanbanTicketCard } from "./kanban-ticket-card";
import { SidebarSelectFields } from "@/features/build/ticket-details/sidebar-select-fields";
import { TriageRow } from "@/features/build/triage/triage-row";
import { CycleCard } from "@/features/build/cycles/cycle-card";
import { ModuleCard } from "@/features/build/modules/module-card";
import { EpicCard } from "@/features/build/epics/epic-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  STUB_STATUSES,
  STUB_EPICS,
  STUB_MODULES,
  STUB_CYCLES,
  STUB_TICKET,
  COLUMNS,
  STUB_FULL_TICKET,
  STUB_TRIAGE_TICKET_B,
  STUB_CYCLE_ACTIVE,
  STUB_CYCLE_PLANNED,
  STUB_MODULE_A,
  STUB_MODULE_B,
} from "./execution-core-gallery-stubs";

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
      <h2 id={`case-title-${id}`} className="mb-2 text-sm font-medium">
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

export function KanbanOverflowCase() {
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
                    ticket={ticket}
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

export function TicketDetailCase() {
  const [status, setStatus] = useState("IN_PROGRESS");
  const [priority, setPriority] = useState("HIGH");
  const stubTicket = { id: 42, status, priority, type: "STORY", points: 5, epicId: null, moduleId: null, cycleId: null };

  return (
    <GalleryCase id="ticket-detail-two-panel" title="Ticket detail — two-panel layout with real sidebar controls">
      <div className="flex min-h-[24rem] gap-0">
        <div className="flex min-w-0 flex-1 flex-col gap-3 border-r p-4">
          <div>
            <span className="font-mono text-xs text-muted-foreground">PROJ-42</span>
            <h3 className="text-base font-medium">Implement token-refresh flow for idle sessions</h3>
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

export function KanbanLoadingCase() {
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

export function TriageCase() {
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

export function CycleCase() {
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

export function ModuleCase() {
  return (
    <GalleryCase id="module-cards" title="Modules — module cards">
      <div className="grid grid-cols-2 gap-3 p-4">
        <ModuleCard module={STUB_MODULE_A} projectId={1} index={0} />
        <ModuleCard module={STUB_MODULE_B} projectId={1} index={1} />
      </div>
    </GalleryCase>
  );
}

export function EpicCase() {
  return (
    <GalleryCase id="epic-card" title="Epics — epic card">
      <div className="p-4">
        <EpicCard
          epic={{ id: 1, title: "Platform Foundation Epic", status: "IN_PROGRESS", priority: "HIGH", description: "Foundation services, auth, and core data models.", version: 1 }}
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
