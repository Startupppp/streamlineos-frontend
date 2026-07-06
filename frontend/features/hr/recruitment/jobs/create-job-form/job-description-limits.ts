export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Keeps leading/trailing spaces while clamping to max complete words. */
export function clampToWordLimit(value: string, maxWords: number): string {
  if (!value.trim()) return value;
  const tokens = value.match(/\S+\s*/g);
  if (!tokens || tokens.length <= maxWords) return value;
  return tokens.slice(0, maxWords).join("");
}

export const JOB_DESCRIPTION_LIMITS = {
  overview: { minWords: 10, maxWords: 200 },
  responsibilities: { minWords: 10, maxWords: 400 },
  jobRequirements: { minWords: 10, maxWords: 400 },
  benefits: { maxWords: 200 },
} as const;

function wordRangeSchema(minWords: number, maxWords: number, label: string) {
  return (value: string) => {
    const words = countWords(value);
    if (words < minWords) {
      return `${label} must be at least ${minWords} words`;
    }
    if (words > maxWords) {
      return `${label} must be at most ${maxWords} words`;
    }
    return true;
  };
}

export const overviewWordCheck = wordRangeSchema(
  JOB_DESCRIPTION_LIMITS.overview.minWords,
  JOB_DESCRIPTION_LIMITS.overview.maxWords,
  "Overview",
);

export const responsibilitiesWordCheck = wordRangeSchema(
  JOB_DESCRIPTION_LIMITS.responsibilities.minWords,
  JOB_DESCRIPTION_LIMITS.responsibilities.maxWords,
  "Responsibilities",
);

export const jobRequirementsWordCheck = wordRangeSchema(
  JOB_DESCRIPTION_LIMITS.jobRequirements.minWords,
  JOB_DESCRIPTION_LIMITS.jobRequirements.maxWords,
  "Requirements",
);

export function benefitsWordCheck(value: string) {
  if (!value.trim()) return true;
  const words = countWords(value);
  if (words > JOB_DESCRIPTION_LIMITS.benefits.maxWords) {
    return `Benefits must be at most ${JOB_DESCRIPTION_LIMITS.benefits.maxWords} words`;
  }
  return true;
}
