"use client";

import {
  KanbanOverflowCase,
  TicketDetailCase,
  KanbanLoadingCase,
  TriageCase,
  CycleCase,
  ModuleCase,
  EpicCase,
} from "./execution-core-gallery-frames";

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
