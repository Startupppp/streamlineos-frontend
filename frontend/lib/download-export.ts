import { apiClient } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download-blob";


const NOT_AN_EXPORT = [/^text\/html/i, /^application\/json/i, /^application\/problem\+json/i];

export class EmptyExportError extends Error {
  constructor(label: string) {
    super(
      `The ${label} export came back empty. Nothing was saved — this is a server or connection problem, not an empty result.`,
    );
    this.name = "EmptyExportError";
  }
}

export class NotAnExportError extends Error {
  constructor(label: string, contentType: string) {
    super(
      `The ${label} export came back as ${contentType} instead of a file. Nothing was saved.`,
    );
    this.name = "NotAnExportError";
  }
}

export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  const name = plain?.[1]?.trim();
  return name ? name : null;
}

export interface DownloadExportOptions {
  label: string;
  fallbackName: string;
  signal?: AbortSignal;
}

export async function downloadExport(
  endpoint: string,
  options: DownloadExportOptions,
): Promise<{ filename: string; bytes: number }> {
  const captured: { headers: Headers | null } = { headers: null };

  const blob = await apiClient.download(endpoint, undefined, {
    signal: options.signal,
    onResponseHeaders: (received) => {
      captured.headers = received;
    },
  });

  const contentType = blob.type || captured.headers?.get("content-type") || "";
  if (NOT_AN_EXPORT.some((pattern) => pattern.test(contentType)))
    throw new NotAnExportError(options.label, contentType.split(";")[0]);

  if (blob.size === 0) throw new EmptyExportError(options.label);

  const filename =
    filenameFromDisposition(captured.headers?.get("content-disposition") ?? null) ??
    options.fallbackName;

  downloadBlob(blob, filename);
  return { filename, bytes: blob.size };
}
