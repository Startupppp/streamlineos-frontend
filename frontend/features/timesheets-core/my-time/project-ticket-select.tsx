"use client";
import { useCallback } from "react";
import { useProjects } from "@/hooks/api/projects/projects";
import { useTickets } from "@/hooks/api/projects/tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectListItem, Ticket } from "@/types/projects";

interface ProjectTicketSelectProps {
  projectId: number | null;
  ticketId: number | null;
  onProjectChange: (id: number | null) => void;
  onTicketChange: (id: number | null) => void;
  disabled?: boolean;
}

export function ProjectTicketSelect({
  projectId,
  ticketId,
  onProjectChange,
  onTicketChange,
  disabled = false,
}: ProjectTicketSelectProps) {
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  const ticketsResult = useTickets(projectId ?? 0);
  const tickets = ticketsResult.data?.data ?? [];
  const ticketsLoading = ticketsResult.isLoading;

  const handleProjectChange = useCallback(
    (val: string) => {
      onProjectChange(val === "none" ? null : parseInt(val, 10));
      onTicketChange(null);
    },
    [onProjectChange, onTicketChange],
  );

  const handleTicketChange = useCallback(
    (val: string) => {
      onTicketChange(val === "none" ? null : parseInt(val, 10));
    },
    [onTicketChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={projectId !== null ? String(projectId) : "none"}
        onValueChange={handleProjectChange}
        disabled={disabled}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          <SelectItem value="none" className="text-xs text-muted-foreground">
            No project
          </SelectItem>
          {projects.map((p: ProjectListItem) => (
            <SelectItem key={p.id} value={String(p.id)} className="text-xs">
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {projectId !== null && (
        <Select
          value={ticketId !== null ? String(ticketId) : "none"}
          onValueChange={handleTicketChange}
          disabled={disabled || ticketsLoading}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder={ticketsLoading ? "Loading…" : "Select ticket"} />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="none" className="text-xs text-muted-foreground">
              No ticket
            </SelectItem>
            {tickets.map((t: Ticket) => (
              <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                #{t.ticketNumber}: {t.title ?? "Untitled"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
