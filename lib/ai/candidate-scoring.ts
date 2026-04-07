import "server-only";

import { aiJSON, isOpenAIConfigured } from "./openai";
import { candidateScoringPrompt, type CandidateScoringInput, type CandidateScoreResult } from "./prompts";
import { db } from "@/lib/db";
import { candidates, jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

/** Score a candidate using AI. */
export async function aiScoreCandidate(
  orgId: string,
  candidateId: number,
  jobId?: number,
): Promise<CandidateScoreResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-score-candidate] OpenAI not configured");
    return null;
  }

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)));

  if (!candidate) return null;

  let job: { title: string; description: string | null; requiredSkills: string[] | null } | null = null;
  if (jobId) {
    const [jobRecord] = await db
      .select({
        title: jobPostings.title,
        description: jobPostings.description,
        requiredSkills: jobPostings.requiredSkills,
      })
      .from(jobPostings)
      .where(and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, orgId)));
    if (jobRecord) job = jobRecord;
  }

  const input: CandidateScoringInput = {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    currentCompany: candidate.currentCompany,
    currentRole: candidate.currentRole,
    experienceYears: candidate.experienceYears,
    skills: candidate.skills,
    source: candidate.source,
    notes: candidate.notes,
    jobTitle: job?.title,
    jobDescription: job?.description,
    jobRequiredSkills: job?.requiredSkills,
  };

  const prompt = candidateScoringPrompt(input);

  const result = await aiJSON<CandidateScoreResult>({
    model: "fast",
    system: prompt.system,
    user: prompt.user,
    maxTokens: 600,
  });

  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  // Persist score as 0-5 rating on candidate
  const ratingFiveScale = Math.round((result.score / 100) * 5);
  await db
    .update(candidates)
    .set({ rating: ratingFiveScale, updatedAt: new Date() })
    .where(and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)));

  return result;
}
