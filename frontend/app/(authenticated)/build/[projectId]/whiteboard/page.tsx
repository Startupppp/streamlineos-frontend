import { WhiteboardPage } from "@/features/build/whiteboard/whiteboard-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  const { projectId: projectIdStr } = await params;
  const { board: boardParam } = await searchParams;
  const projectId = Number(projectIdStr);
  const initialBoardId =
    boardParam !== undefined && Number.isInteger(Number(boardParam))
      ? Number(boardParam)
      : null;

  return <WhiteboardPage projectId={projectId} initialBoardId={initialBoardId} />;
}
