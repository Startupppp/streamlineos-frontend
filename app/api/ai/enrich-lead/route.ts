import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiJSON, isOpenAIConfigured } from "@/lib/ai/openai";
import { leadEnrichmentPrompt, type LeadEnrichmentResult } from "@/lib/ai/prompts";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
});

/** POST /api/ai/enrich-lead — Generate a research brief for a lead */
export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) return err("AI not configured", 503);

    const input = await parseBody(req, schema);
    const prompt = leadEnrichmentPrompt(input);

    const result = await aiJSON<LeadEnrichmentResult>({
      model: "standard", // Use GPT-4o for better research quality
      system: prompt.system,
      user: prompt.user,
      maxTokens: 1024,
    });

    return ok(result);
  });
}
