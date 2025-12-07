import { getProjectDetails } from "@/app/actions/projects";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { notFound } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectBoardPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProjectDetails(parseInt(id));

  if (!data.project) return notFound();

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary">{data.project.name}</h1>
            <p className="text-muted-foreground">{data.project.description}</p>
        </div>
        <CreateTicketDialog projectId={parseInt(id)} />
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard tickets={data.tickets} projectId={parseInt(id)} />
      </div>
    </div>
  );
}
