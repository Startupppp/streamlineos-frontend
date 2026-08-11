import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default function ProjectBoardWorkspaceRoute({ params }: PageProps) {
  return <ProjectBoardPage params={params} />;
}
