import { ProjectSprintsPage } from "@/features/build/sprints/project-sprints-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectSprintsPage projectId={projectId} />;
}
