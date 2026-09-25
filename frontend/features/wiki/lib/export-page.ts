import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const exportResultContract = z.object({
  jobId: z.number().int(),
  format: z.enum(["markdown", "html"]),
  content: z.string(),
});

type ExportResult = z.infer<typeof exportResultContract>;

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportKbPage(pageId: number, format: "html" | "markdown"): Promise<void> {
  const result = await apiClient.post<ExportResult>(
    `/kb/pages/${pageId}/export`,
    { format },
    undefined,
    exportResultContract,
  );
  const mimeType =
    result.format === "html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
  const ext = result.format === "html" ? ".html" : ".md";
  triggerDownload(result.content, `page-${pageId}${ext}`, mimeType);
}
