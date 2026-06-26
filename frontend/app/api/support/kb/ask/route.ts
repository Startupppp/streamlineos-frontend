import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { z } from "zod";
import { answerQuestion } from "@/lib/services/kb-rag";
import { isEmbeddingConfigured } from "@/lib/ai/embeddings";

const askSchema = z.object({
  question: z.string().trim().min(3, "Question is too short").max(1000),
  articleId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  return withAbility("view", "support:kb", async (session) => {
    if (!isEmbeddingConfigured()) {
      return err("AI assistant is not configured", 503);
    }
    const input = await parseBody(req, askSchema);
    const result = await answerQuestion({
      orgId: session.orgId,
      question: input.question,
      articleId: input.articleId,
    });
    return ok(result);
  });
}
