import { ProjectBoardPage } from "@/features/build/project-detail/project-board-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectBoardRoute({ params }: PageProps) {
  return <ProjectBoardPage params={params} />;
}
