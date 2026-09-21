"use client";

import { useMemo } from "react";
import { useCan } from "@/hooks/api/access";

export interface CommandPaletteCommand {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  shortcut?: string;
  isAvailable: boolean;
  execute(): void | Promise<void>;
}

export function useCommandRegistry({
  projectId,
  handleSelect,
  handleCreateTicket,
}: {
  projectId: number | null;
  handleSelect: (href: string) => void;
  handleCreateTicket: () => void;
}): CommandPaletteCommand[] {
  const canCreateTicket = useCan("build:tickets:create");

  return useMemo<CommandPaletteCommand[]>(
    () => [
      {
        id: "create-ticket",
        label: "Create ticket",
        group: "actions",
        keywords: ["create", "ticket", "issue"],
        shortcut: "C",
        isAvailable: canCreateTicket,
        execute: handleCreateTicket,
      },
      {
        id: "project-board",
        label: "Board",
        group: "actions",
        keywords: ["project", "Board"],
        shortcut: "G B",
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null) handleSelect(`/build/${projectId}`);
        },
      },
      {
        id: "project-backlog",
        label: "Backlog",
        group: "actions",
        keywords: ["project", "Backlog"],
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null) handleSelect(`/build/${projectId}/backlog`);
        },
      },
      {
        id: "project-cycles",
        label: "Cycles",
        group: "actions",
        keywords: ["project", "Cycles"],
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null) handleSelect(`/build/${projectId}/cycles`);
        },
      },
      {
        id: "project-my-tickets",
        label: "My Tickets",
        group: "actions",
        keywords: ["project", "My", "Tickets"],
        shortcut: "G I",
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null)
            handleSelect(`/build/${projectId}/my-tickets`);
        },
      },
      {
        id: "project-analytics",
        label: "Analytics",
        group: "actions",
        keywords: ["project", "Analytics"],
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null)
            handleSelect(`/build/${projectId}/analytics`);
        },
      },
      {
        id: "nav-all-projects",
        label: "All Projects",
        group: "navigation",
        keywords: ["all", "projects", "overview"],
        isAvailable: true,
        execute: () => handleSelect("/build"),
      },
      {
        id: "nav-my-work",
        label: "My Work",
        group: "navigation",
        keywords: ["my", "work", "tickets", "assigned"],
        isAvailable: true,
        execute: () => handleSelect("/build/my-work"),
      },
    ],
    [canCreateTicket, projectId, handleSelect, handleCreateTicket],
  );
}
