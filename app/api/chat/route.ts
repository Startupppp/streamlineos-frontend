import { auth } from "../../../lib/auth";
import { processChatWithGraph } from "../../../lib/ai/langchain-graph";
import { z } from "zod";
import { logger } from "../../../lib/logger";

export const maxDuration = 30;

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(10000),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response("Invalid request body", { status: 400 });
    }

    const session = await auth();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const orgId = "orgId" in session && typeof session.orgId === "string" ? session.orgId : undefined;
    if (!orgId) {
      return new Response("No organization context", { status: 403 });
    }
    const result = await processChatWithGraph(
      parsed.data.messages,
      session.user.id,
      orgId
    );
    return result.toTextStreamResponse();
  } catch (error) {
    logger.error("Chat route error", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
