import { ProjectsPage } from "@/features/build/project-list/projects-page";

interface Props {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function AllProjectsWorkspaceRoute({ params }: Props) {
  const { pmWorkspaceId } = await params;
  return <ProjectsPage pmWorkspaceId={pmWorkspaceId} />;
}
