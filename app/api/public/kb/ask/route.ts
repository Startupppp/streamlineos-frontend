import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { z } from "zod";
import { answerQuestion } from "@/lib/services/kb-rag";
import { isEmbeddingConfigured } from "@/lib/ai/embeddings";

const askSchema = z.object({
  org: z.string().trim().min(1),
  question: z.string().trim().min(3, "Question is too short").max(1000),
});

export async function POST(req: NextRequest) {
  if (!isEmbeddingConfigured()) {
    return err("AI assistant is not available", 503);
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request", 400);

  const result = await answerQuestion({
    orgId: parsed.data.org,
    question: parsed.data.question,
    publicOnly: true,
  });
  return ok(result);
}
