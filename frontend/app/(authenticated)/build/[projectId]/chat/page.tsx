import { ProjectChatPage } from "@/features/build/project-detail/project-chat-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectChatPage projectId={projectId} />;
}
