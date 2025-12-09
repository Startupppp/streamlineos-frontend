import { auth } from '@clerk/nextjs/server';
import { processChatWithGraph } from '@/lib/ai/langchain-graph';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await processChatWithGraph(messages, userId, orgId);
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
