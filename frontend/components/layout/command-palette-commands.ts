"use client";

import { type ComponentType, useMemo } from "react";
import {
  Plus,
  Kanban,
  ListTodo,
  RefreshCw,
  Star,
  BarChart2,
  LayoutDashboard,
} from "lucide-react";
import { useCan } from "@/hooks/api/access";

export interface CommandPaletteCommand {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  shortcut?: string;
  icon: ComponentType<{ className?: string }>;
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
        icon: Plus,
        isAvailable: canCreateTicket,
        execute: handleCreateTicket,
      },
      {
        id: "project-board",
        label: "Board",
        group: "actions",
        keywords: ["project", "Board"],
        shortcut: "G B",
        icon: Kanban,
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
        icon: ListTodo,
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
        icon: RefreshCw,
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
        icon: Star,
        isAvailable: projectId !== null,
        execute: () => {
          if (projectId !== null)
            handleSelect(
              `/build/my-work?projectId=${encodeURIComponent(projectId)}`,
            );
        },
      },
      {
        id: "project-analytics",
        label: "Analytics",
        group: "actions",
        keywords: ["project", "Analytics"],
        icon: BarChart2,
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
        icon: LayoutDashboard,
        isAvailable: true,
        execute: () => handleSelect("/build"),
      },
      {
        id: "nav-my-work",
        label: "My Work",
        group: "navigation",
        keywords: ["my", "work", "tickets", "assigned"],
        icon: Star,
        isAvailable: true,
        execute: () => handleSelect("/build/my-work"),
      },
    ],
    [canCreateTicket, projectId, handleSelect, handleCreateTicket],
  );
}
