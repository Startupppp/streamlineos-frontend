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

export type AiFeedbackType = "bug" | "idea" | "feature" | "question" | "praise" | "other";

export interface AiAssistResult {
  suggestedType: AiFeedbackType;
  title: string;
  description: string;
}

export type AiAssistError =
  | { kind: "credits_exhausted" }
  | { kind: "rate_limited" }
  | { kind: "feature_off" }
  | { kind: "unavailable" };

export interface AiAssistOptions {
  apiBase: string;
  key: string;
  type: string;
  message: string;
  pageUrl: string;
  screenshot: Blob | null;
}

export async function aiAssistFeedback(
  opts: AiAssistOptions,
): Promise<AiAssistResult | AiAssistError> {
  const form = new FormData();
  form.append("type", opts.type);
  form.append("message", opts.message);
  form.append("pageUrl", opts.pageUrl);
  if (opts.screenshot) {
    const mime = opts.screenshot.type || "image/jpeg";
    form.append("screenshot", new Blob([opts.screenshot], { type: mime }), "screenshot.jpg");
  }

  let res: Response;
  try {
    res = await fetch(`${opts.apiBase}/public/feedbucket/${opts.key}/ai-assist`, {
      method: "POST",
      body: form,
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (res.status === 402) return { kind: "credits_exhausted" };
  if (res.status === 429) return { kind: "rate_limited" };
  if (res.status === 403 || res.status === 404) return { kind: "feature_off" };
  if (!res.ok) return { kind: "unavailable" };

  try {
    const data: unknown = await res.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "suggestedType" in data &&
      "title" in data &&
      "description" in data &&
      typeof (data as Record<string, unknown>)["suggestedType"] === "string" &&
      typeof (data as Record<string, unknown>)["title"] === "string" &&
      typeof (data as Record<string, unknown>)["description"] === "string"
    ) {
      return {
        suggestedType: (data as Record<string, unknown>)["suggestedType"] as AiFeedbackType,
        title: String((data as Record<string, unknown>)["title"]),
        description: String((data as Record<string, unknown>)["description"]),
      };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
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
    const screenshotMime = opts.screenshot.type || "image/jpeg";
    const screenshotBlob = new Blob([opts.screenshot], { type: screenshotMime });
    form.append("screenshot", screenshotBlob, "screenshot.jpg");
  }
  if (opts.recording) {
    form.append("recording", opts.recording, "recording.webm");
  }

  let res: Response;
  try {
    res = await fetch(`${opts.apiBase}/public/feedbucket/${opts.key}`, {
      method: "POST",
      body: form,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network error";
    throw new Error(`Could not reach the server (${reason})`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 160);
    } catch {
      detail = "";
    }
    throw new Error(`Submission failed (HTTP ${res.status})${detail ? `: ${detail}` : ""}`);
  }
}
