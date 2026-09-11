import { WorkflowDetailPage } from "@/features/workflows/builder/workflow-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return <WorkflowDetailPage workflowId={workflowId} />;
}
