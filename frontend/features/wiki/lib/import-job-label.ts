export function importJobItemTitles(
  errorReport: Record<string, unknown> | null | undefined,
): string[] {
  if (!errorReport) return [];
  const raw = errorReport.itemTitles;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (title): title is string => typeof title === "string" && title.trim().length > 0,
  );
}

export function importJobDisplayName(
  job: {
    totalItems: number;
    sourceType: string;
    errorReport: Record<string, unknown> | null | undefined;
  },
): string {
  const titles = importJobItemTitles(job.errorReport);
  if (titles.length === 1) return titles[0] ?? "Untitled";
  if (titles.length === 2) return `${titles[0]}, ${titles[1]}`;
  if (titles.length > 2)
    return `${titles[0]}, ${titles[1]} +${titles.length - 2} more`;
  if (job.totalItems === 1) return "1 page";
  if (job.totalItems > 1) return `${job.totalItems} pages`;


  const sourceLabel =
    job.sourceType === "markdown"
      ? "Markdown"
      : job.sourceType === "html"
        ? "HTML"
        : job.sourceType === "zip"
          ? "ZIP"
          : "Import";
  return `${sourceLabel} import`;
}
