const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Dates are formatted in UTC on the server so the HTML is identical for every reader and crawler. */
export function formatJournalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE.format(d);
}

/** True when the update is meaningfully later than first publication (more than a day). */
export function isMeaningfulUpdate(publishedAt: string | null, modifiedAt: string | null): boolean {
  if (!publishedAt || !modifiedAt) return false;
  return new Date(modifiedAt).getTime() - new Date(publishedAt).getTime() > 24 * 60 * 60 * 1000;
}
