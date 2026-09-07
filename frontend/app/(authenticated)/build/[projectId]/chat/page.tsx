import { BuildProjectChatPage } from "@/features/chat/build-project-chat-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <BuildProjectChatPage projectId={projectId} />;
}
