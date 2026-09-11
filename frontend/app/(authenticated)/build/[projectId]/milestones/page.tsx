import { ProjectMilestonesPage } from "@/features/build/milestones/project-milestones-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectMilestonesPage projectId={projectId} />;
}
