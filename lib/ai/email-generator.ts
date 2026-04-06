import "server-only";

import { aiJSON, isOpenAIConfigured } from "./openai";
import {
  emailGeneratorPrompt,
  type EmailGeneratorInput,
  type EmailTone,
  type GeneratedEmail,
} from "./prompts";

/**
 * Generate a follow-up email for a lead/deal.
 * Returns null if OpenAI is not configured.
 */
export async function generateFollowUpEmail(
  input: EmailGeneratorInput,
): Promise<GeneratedEmail | null> {
  if (!isOpenAIConfigured()) return null;

  const prompt = emailGeneratorPrompt(input);

  return aiJSON<GeneratedEmail>({
    model: "fast",
    system: prompt.system,
    user: prompt.user,
    maxTokens: 1024,
  });
}

/**
 * Generate multiple email variations with different tones.
 * Useful for A/B testing or giving the sales rep options.
 */
export async function generateEmailVariations(
  input: Omit<EmailGeneratorInput, "tone">,
  tones: EmailTone[] = ["formal", "friendly", "urgent"],
): Promise<Record<EmailTone, GeneratedEmail>> {
  const results = {} as Record<EmailTone, GeneratedEmail>;

  for (const tone of tones) {
    const email = await generateFollowUpEmail({ ...input, tone });
    if (email) results[tone] = email;
  }

  return results;
}
