import { apiClient } from "@/lib/api-client";

export async function downloadCalendarExport(from: string, to: string): Promise<void> {
  const blob = await apiClient.download("/calendar/export", { from, to });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `calendar-${from}-to-${to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
