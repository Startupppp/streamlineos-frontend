import { ProjectBudgetPage } from "@/features/build/project-detail/project-budget-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBudgetPage projectId={projectId} />;
}
