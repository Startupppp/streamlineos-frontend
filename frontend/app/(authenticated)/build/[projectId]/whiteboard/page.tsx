import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WhiteboardPage } from "@/features/build/whiteboard/whiteboard-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/whiteboard");
  const { projectId: projectIdStr } = await params;
  const { board: boardParam } = await searchParams;
  const projectId = Number(projectIdStr);
  const initialBoardId =
    boardParam !== undefined && Number.isInteger(Number(boardParam))
      ? Number(boardParam)
      : null;

  return <WhiteboardPage projectId={projectId} initialBoardId={initialBoardId} />;
}
