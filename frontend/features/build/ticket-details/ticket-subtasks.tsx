"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks } from "lucide-react";
import { useProject } from "@/hooks/api";
import { SubtaskRow } from "./subtask-row";
import { SubtaskComposer } from "./subtask-composer";
import { TicketAiSuggestSubtasksAction } from "@/features/build/ai/ticket-detail-ai";
import type { Ticket } from "@/types/projects";
import type { ProjectStatusRecord } from "@/types/projects";

interface TicketSubtasksProps {
  ticketId: number;
  projectId: number;
  subtasks: Ticket[];
  canUseAI?: boolean;
}

export function TicketSubtasks({
  ticketId,
  projectId,
  subtasks,
  canUseAI = false,
}: TicketSubtasksProps) {
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);

  const projectKey = projectData?.key ?? null;
  const projectStatuses: ProjectStatusRecord[] = projectData?.statuses ?? [];

  const subtasksDone = subtasks.filter((s) => s.status === "DONE").length;
  const subtasksTotal = subtasks.length;
  const subtaskProgress = subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0;

  return (
    <div className="pt-2">
      <div className="mb-3 flex w-full items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Subtasks</h4>
        {subtasksTotal > 0 && (
          <Badge variant="secondary" className="text-xs">
            {subtasksDone}/{subtasksTotal}
          </Badge>
        )}
        <TicketAiSuggestSubtasksAction
          projectId={projectId}
          ticketId={ticketId}
          canUseAI={canUseAI}
        />
      </div>

      {subtasksTotal > 0 && (
        <Progress value={subtaskProgress} className="h-1.5 mb-3" />
      )}

      {projectLoading && subtasksTotal === 0 ? (
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-10 w-full rounded-lg" />         <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-1 mb-3">
          {subtasks.map((sub) => (
            <SubtaskRow
              key={sub.id}
              subtask={sub}
              projectId={projectId}
              projectKey={projectKey}
              projectStatuses={projectStatuses}
            />
          ))}
        </div>
      )}

      <SubtaskComposer
        ticketId={ticketId}
        projectId={projectId}
        projectStatuses={projectStatuses}
      />
    </div>
  );
}
