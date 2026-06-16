import { withAbility, ok, err } from "@/lib/api/helpers";
import { indexAllArticles } from "@/lib/services/kb-rag";
import { isEmbeddingConfigured } from "@/lib/ai/embeddings";

export async function POST() {
  return withAbility("manage", "support:kb", async (session) => {
    if (!isEmbeddingConfigured()) {
      return err("AI assistant is not configured", 503);
    }
    const result = await indexAllArticles(session.orgId);
    return ok(result);
  });
}
