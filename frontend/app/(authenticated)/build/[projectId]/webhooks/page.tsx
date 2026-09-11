import { ProjectWebhooksPage } from "@/features/build/webhooks/project-webhooks-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWebhooksPage projectId={projectId} />;
}
