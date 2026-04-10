import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiSuggestHelpdeskReply } from "@/lib/ai/helpdesk-reply";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  ticketId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    const { ticketId } = await parseBody(req, schema);
    const result = await aiSuggestHelpdeskReply(session.orgId, ticketId);

    if (!result) {
      return err("Ticket not found or reply generation failed", 404);
    }

    return ok(result);
  });
}
