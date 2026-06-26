import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { requireFeature } from "@/lib/billing/server-feature";
import { aiScoreCandidate } from "@/lib/ai/candidate-scoring";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  candidateId: z.number().int().positive(),
  jobId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const featureGuard = requireFeature(session.plan, "ai.candidate-scoring");
    if (featureGuard) return featureGuard;
    if (!isOpenAIConfigured()) {
      return err("AI scoring is not configured. Set OPENAI_API_KEY.", 503);
    }

    const { candidateId, jobId } = await parseBody(req, schema);
    const result = await aiScoreCandidate(session.orgId, candidateId, jobId);

    if (!result) {
      return err("Candidate not found or scoring failed", 404);
    }

    return ok(result);
  });
}
