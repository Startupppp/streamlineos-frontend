import { ProjectBacklogPage } from "@/features/build/backlog/project-backlog-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBacklogPage projectId={projectId} />;
}
