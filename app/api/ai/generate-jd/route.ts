import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { requireFeature } from "@/lib/billing/server-feature";
import { aiText, isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const generateJdSchema = z.object({
  title: z.string().min(1).max(200),
  requirements: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    const input = await parseBody(req, generateJdSchema);

    const contextLines: string[] = [`Job Title: ${input.title}`];
    if (input.location) contextLines.push(`Location: ${input.location}`);
    if (input.type) contextLines.push(`Employment Type: ${input.type.replace("_", " ")}`);
    if (input.salaryMin && input.salaryMax) {
      contextLines.push(`Salary Range: ₹${input.salaryMin.toLocaleString("en-IN")} – ₹${input.salaryMax.toLocaleString("en-IN")} per annum`);
    }
    if (input.requirements) contextLines.push(`Key Requirements / Skills:\n${input.requirements}`);

    const systemPrompt = `You are an expert HR recruiter and technical writer.
Write a professional, engaging job description in plain text (no markdown formatting).
Structure: Overview paragraph (3-4 sentences), Key Responsibilities (5-7 bullet points starting with "-"), Requirements (5-7 bullet points starting with "-"), What We Offer (3-4 bullet points starting with "-").
Keep it concise, specific, and compelling. Do not use bold, headers, or markdown.`;

    const userPrompt = `Write a job description for the following role:\n\n${contextLines.join("\n")}`;

    const description = await aiText({
      model: "fast",
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
    });

    return ok({ description: description.trim() });
  });
}
