import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BuildProjectChatPage } from "@/features/chat/build-project-chat-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/chat");
  const { projectId } = await params;
  return <BuildProjectChatPage projectId={projectId} />;
}
