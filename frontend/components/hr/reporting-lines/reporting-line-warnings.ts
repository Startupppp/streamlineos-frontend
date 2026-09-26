/**
 * HRM-15: the one place a reporting-line warning code (backend
 * REPORTING_LINE_WARNINGS) becomes a sentence. Callers never show a raw code;
 * an unknown code gets a generic sentence, so a new backend warning degrades
 * to something readable instead of leaking an identifier.
 */
const WARNING_SENTENCES: Record<string, string> = {
  PRIMARY_CHANGE_THRESHOLD_EXCEEDED:
    "This employee's primary manager has now changed more times in 24 hours than your policy expects. The reason was recorded.",
  EMERGENCY_OVERRIDE: "Saved as an emergency change and logged as a high-severity event.",
  FALLBACK_ASSIGNED: "The primary manager was assigned by the onboarding fallback policy. Confirm or replace them on the employee's profile.",
};

export const UNKNOWN_WARNING_SENTENCE = "Saved, with a warning from the server. Check the employee's reporting line.";

export function describeReportingWarning(code: string): string {
  return WARNING_SENTENCES[code] ?? UNKNOWN_WARNING_SENTENCE;
}

/** Distinct sentences for a response's warnings (two unknown codes read once). */
export function describeReportingWarnings(codes: readonly string[]): string[] {
  return [...new Set(codes.map(describeReportingWarning))];
}
