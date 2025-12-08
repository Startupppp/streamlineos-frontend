"use client";

import { api } from "@/trpc/react";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { use } from "react";
import { type Ticket } from "@/types/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const { data, isLoading } = api.project.getProjectDetails.useQuery({ id: projectId });

  if (isLoading) {
    return (
      <div className="p-8 h-full flex flex-col">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!data) return notFound();

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary">{data.name}</h1>
            <p className="text-muted-foreground">{data.description}</p>
        </div>
        <CreateTicketDialog projectId={projectId} />
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard 
            tickets={(data.tickets || []).map((t: Ticket) => ({
                id: t.id,
                title: t.title,
                status: t.status ?? "TODO",
                type: t.type ?? "TASK",
                assignee: t.assignee ? { firstName: t.assignee.firstName ?? undefined } : undefined
            }))} 
            projectId={projectId} 
        />
      </div>
    </div>
  );
}
