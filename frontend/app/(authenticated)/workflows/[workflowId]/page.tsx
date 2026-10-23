import { notFound } from "next/navigation";
import { z } from "zod";
import { WorkflowDetailPage } from "@/features/workflows/builder/workflow-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  if (!z.guid().safeParse(workflowId).success) notFound();
  return <WorkflowDetailPage workflowId={workflowId} />;
}
