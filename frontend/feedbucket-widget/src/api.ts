import type { LogEntry } from "./console-capture";
import type { Metadata } from "./metadata";

export interface SubmitOptions {
  apiBase: string;
  key: string;
  type: string;
  message: string;
  pageUrl: string;
  reporterName: string;
  reporterEmail: string;
  metadata: Metadata;
  consoleLogs: LogEntry[];
  screenshot: Blob | null;
  recording?: Blob | null;
}

export async function submitFeedback(opts: SubmitOptions): Promise<void> {
  const form = new FormData();
  form.append("type", opts.type);
  form.append("message", opts.message);
  form.append("pageUrl", opts.pageUrl);

  if (opts.reporterName.trim()) {
    form.append("reporterName", opts.reporterName.trim());
  }
  if (opts.reporterEmail.trim()) {
    form.append("reporterEmail", opts.reporterEmail.trim());
  }

  form.append("metadata", JSON.stringify(opts.metadata));
  form.append("consoleLogs", JSON.stringify(opts.consoleLogs));

  if (opts.screenshot) {
    form.append("screenshot", opts.screenshot, "screenshot.png");
  }
  if (opts.recording) {
    form.append("recording", opts.recording, "recording.webm");
  }

  const res = await fetch(`${opts.apiBase}/public/feedbucket/${opts.key}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("Submission failed");
  }
}
