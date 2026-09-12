import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export const EXPORT_TRUNCATED_HEADER = "X-Export-Truncated";
export const EXPORT_ROW_COUNT_HEADER = "X-Export-Row-Count";

export function warnIfExportTruncated(headers: Headers): void {
  if (headers.get(EXPORT_TRUNCATED_HEADER) !== "true") return;
  const rowCount = headers.get(EXPORT_ROW_COUNT_HEADER);
  const rows = rowCount === null ? "the maximum number of rows" : `${rowCount} rows`;
  toast.warning("This export is incomplete", {
    description: `The date range holds more events than one export can carry, so the file stops at ${rows}. Export a narrower date range to get the events that were left out.`,
  });
}

export async function downloadCalendarExport(from: string, to: string): Promise<void> {
  const blob = await apiClient.download("/calendar/export", { from, to }, warnIfExportTruncated);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `calendar-${from}-to-${to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
