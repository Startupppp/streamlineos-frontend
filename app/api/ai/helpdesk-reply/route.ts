import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { requireFeature } from "@/lib/billing/server-feature";
import { aiSuggestHelpdeskReply } from "@/lib/ai/helpdesk-reply";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  ticketId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const featureGuard = requireFeature(session.plan, "ai.reply-suggestion");
    if (featureGuard) return featureGuard;
    if (!isOpenAIConfigured()) {
      return err("AI reply suggestion is not available at this time. Please contact your administrator.", 503);
    }

    const { ticketId } = await parseBody(req, schema);
    let result;
    try {
      result = await aiSuggestHelpdeskReply(session.orgId, ticketId);
    } catch {
      return err("Failed to generate AI reply. Please try again later.", 503);
    }

    if (!result) {
      return err("Ticket not found or reply generation failed", 404);
    }

    return ok(result);
  });
}
