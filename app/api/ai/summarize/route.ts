import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiJSON, isOpenAIConfigured } from "@/lib/ai/openai";
import { conversationSummaryPrompt, type ConversationSummaryResult } from "@/lib/ai/prompts";
import { z } from "zod";

const schema = z.object({
  activityType: z.string().min(1),
  subject: z.string().optional(),
  notes: z.string().min(1, "Notes are required for summarization"),
  leadName: z.string().optional(),
  dealName: z.string().optional(),
});

/** POST /api/ai/summarize — Summarize a call/meeting/activity log */
export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) return err("AI not configured", 503);

    const input = await parseBody(req, schema);
    const prompt = conversationSummaryPrompt(input);

    const result = await aiJSON<ConversationSummaryResult>({
      model: "fast",
      system: prompt.system,
      user: prompt.user,
      maxTokens: 512,
    });

    return ok(result);
  });
}
