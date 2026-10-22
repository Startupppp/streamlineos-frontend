const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatJournalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE.format(d);
}

export function isMeaningfulUpdate(publishedAt: string | null, modifiedAt: string | null): boolean {
  if (!publishedAt || !modifiedAt) return false;
  return new Date(modifiedAt).getTime() - new Date(publishedAt).getTime() > 24 * 60 * 60 * 1000;
}
