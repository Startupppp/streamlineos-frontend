import type { JobTemplateDraft } from "@/hooks/api/hr/recruitment";
import { extractSection } from "./parse-job";
import { JOB_TYPES, type CreateJobFormValues } from "./schema";

const KNOWN_JOB_TYPES = new Set<string>(JOB_TYPES);

/** A stored `type` the form's enum does not know is dropped rather than injected — an unknown option would make the select unopenable. */
function isKnownJobType(value: string): value is CreateJobFormValues["jobType"] {
  return KNOWN_JOB_TYPES.has(value);
}

/**
 * Splits `"5–8 years | Bachelor's"` — the shape `index.tsx` composes on submit —
 * back into the three form fields it was built from.
 */
function readExperience(experience: string, values: Partial<CreateJobFormValues>): void {
  const pipeIdx = experience.indexOf(" | ");
  const range = pipeIdx > -1 ? experience.slice(0, pipeIdx) : experience;

  const min = range.match(/^(\d+)/);
  if (min) values.minExperience = parseInt(min[1], 10);
  const max = range.match(/[–\-](\d+)/);
  if (max) values.maxExperience = parseInt(max[1], 10);
  if (pipeIdx > -1) values.educationLevel = experience.slice(pipeIdx + 3).trim();
}

/**
 * Reads the marker-delimited description a posting stores, and falls back to
 * treating the whole thing as the overview.
 *
 * The fallback is the case that matters. A template authored anywhere other
 * than this wizard holds plain prose with no `=== OVERVIEW ===` marker, and a
 * parser that only understood markers would silently drop the single most
 * valuable thing the template carries.
 */
function readDescription(description: string, values: Partial<CreateJobFormValues>): void {
  const overview = extractSection(description, "OVERVIEW");
  if (!overview) {
    values.overview = description.trim();
    return;
  }

  values.overview = overview;

  const responsibilities = extractSection(description, "RESPONSIBILITIES");
  if (responsibilities) values.responsibilities = responsibilities;

  const workMode = extractSection(description, "WORK MODE");
  if (workMode === "ONSITE" || workMode === "REMOTE" || workMode === "HYBRID") {
    values.workMode = workMode;
  }

  const required = extractSection(description, "REQUIRED SKILLS");
  if (required) values.requiredSkills = splitList(required);

  const preferred = extractSection(description, "PREFERRED SKILLS");
  if (preferred) values.preferredSkills = splitList(preferred);

  const hiringManager = extractSection(description, "HIRING MANAGER");
  if (hiringManager) values.hiringManager = hiringManager;

  const rounds = extractSection(description, "INTERVIEW ROUNDS");
  if (rounds) values.interviewRounds = splitList(rounds);
}

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Splits the requirements blob back into the free text and the two trailing
 * lines `index.tsx` appends to it on submit.
 */
function readRequirements(requirements: string, values: Partial<CreateJobFormValues>): void {
  const parts = requirements.split("\n\n");

  const body = parts
    .filter((part) => !part.startsWith("Education:") && !part.startsWith("Tags:"))
    .join("\n\n")
    .trim();
  if (body) values.jobRequirements = body;

  const education = parts.find((part) => part.startsWith("Education:"));
  if (education && !values.educationLevel) {
    values.educationLevel = education.replace("Education:", "").trim();
  }

  const tags = parts.find((part) => part.startsWith("Tags:"));
  if (tags) values.tags = splitList(tags.replace("Tags:", "").trim());
}

/**
 * Maps the merged draft the server returned onto the wizard's own field names.
 *
 * A template owns exactly seven posting columns — title, type, experience,
 * description, requirements, benefits and screening questions — and this reads
 * only those. The posting lifecycle it deliberately has no column for (status,
 * openings, deadline, location, salary) is therefore untouchable from here, and
 * stays that way as long as nothing is added to the list below.
 *
 * The server merges the flat posting shape; the wizard stores that shape
 * decomposed — one `description` blob against eight separate inputs — so the
 * two halves cannot be the same function and this is the second one.
 */
export function templateDraftToFormValues(
  draft: JobTemplateDraft,
): Partial<CreateJobFormValues> {
  const values: Partial<CreateJobFormValues> = {};

  if (draft.title) values.title = draft.title;
  if (draft.type && isKnownJobType(draft.type)) values.jobType = draft.type;
  if (draft.experience) readExperience(draft.experience, values);
  if (draft.requirements) readRequirements(draft.requirements, values);
  if (draft.benefits) values.benefits = draft.benefits;
  if (draft.screeningQuestions) values.screeningQuestions = draft.screeningQuestions;
  if (draft.description) readDescription(draft.description, values);

  return values;
}
