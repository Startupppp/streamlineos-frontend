"use client";

import { useMemo } from "react";
import {
  Plus,
  Kanban,
  ListTodo,
  RefreshCw,
  Star,
  BarChart2,
  LayoutDashboard,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import { useHrmsCommands } from "./command-palette-hrms-commands";
import type { CommandPaletteCommand } from "./command-palette-command-types";

export type { CommandPaletteCommand } from "./command-palette-command-types";

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
  const hrmsCommands = useHrmsCommands(handleSelect);
  const { setMode } = useAppTheme();

  return useMemo<CommandPaletteCommand[]>(
    () => [
      ...hrmsCommands,
      {
        id: "theme-light",
        label: "Theme: Light",
        group: "actions",
        keywords: ["theme", "light", "appearance", "mode"],
        icon: Sun,
        isAvailable: true,
        execute: () => setMode("light"),
      },
      {
        id: "theme-dark",
        label: "Theme: Dark",
        group: "actions",
        keywords: ["theme", "dark", "appearance", "mode"],
        icon: Moon,
        isAvailable: true,
        execute: () => setMode("dark"),
      },
      {
        id: "theme-system",
        label: "Theme: System",
        group: "actions",
        keywords: ["theme", "system", "appearance", "mode"],
        icon: Monitor,
        isAvailable: true,
        execute: () => setMode("system"),
      },
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
        keywords: ["project", "Cycles", "Sprint", "Sprints", "Iteration"],
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
            handleSelect(`/build/${projectId}/reports?tab=overview`);
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
    [canCreateTicket, hrmsCommands, projectId, handleSelect, handleCreateTicket, setMode],
  );
}
