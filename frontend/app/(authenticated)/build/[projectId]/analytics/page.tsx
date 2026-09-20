import { ProjectAnalyticsPage } from "@/features/build/analytics/project-analytics-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectAnalyticsPage projectId={Number(projectId)} />;
}
