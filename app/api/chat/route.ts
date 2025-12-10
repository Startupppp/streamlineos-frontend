import { auth } from "../../../lib/auth";
import { processChatWithGraph } from "../../../lib/ai/langchain-graph";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const session = await auth();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get orgId from session or context - for now using userId as fallback
    const orgId = (session as { orgId?: string }).orgId || session.user.id;
    const result = await processChatWithGraph(messages, session.user.id, orgId);
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
