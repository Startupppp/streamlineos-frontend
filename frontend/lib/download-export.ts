import { apiClient } from "@/lib/api-client";
import { downloadBlob } from "@/lib/download-blob";

/**
 * Fetch an export and save it, refusing to present a failure as a file.
 *
 * Export buttons used to fetch a blob and hand it straight to an anchor. That
 * is fine while the server is well behaved and misleading the moment it is not:
 * QA downloaded `assets-export.csv` twice from an org holding eight assets and
 * got a 0-byte file both times, with a success toast both times. Nothing between
 * the fetch and the disk looked at what had arrived, so an empty body, an HTML
 * error page from a proxy and a real CSV were all saved the same way and
 * announced the same way.
 *
 * Three checks stand between the response and the disk, and each one fails
 * loudly instead of writing the file:
 *
 *   - `apiClient.download` already rejects a non-2xx with the parsed error
 *     envelope, so a 402 or a 403 arrives here as a message, not as a document;
 *   - a zero-byte body is refused, because a CSV always has at least a header
 *     row now that the server builds one from the table's columns;
 *   - a body the server labelled HTML or JSON is refused, because an export is
 *     neither — that combination means an error page reached the download path.
 *
 * The filename comes from `Content-Disposition` when the server sends one, which
 * is why that header is on the CORS `exposedHeaders` list; `fallbackName` is
 * used when it is absent or unparseable.
 */

/** Media types that mean "this is not the export you asked for". */
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

/**
 * Reads the filename out of a Content-Disposition header.
 *
 * Handles the RFC 5987 `filename*=UTF-8''…` form ahead of plain `filename=`,
 * since a server that sends both puts the encoded one second and it is the more
 * accurate of the two.
 */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;

  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // A malformed percent-escape is not worth failing a download over.
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  const name = plain?.[1]?.trim();
  return name ? name : null;
}

export interface DownloadExportOptions {
  /** Used in the error messages a person reads. */
  label: string;
  /** Filename when the server sends no Content-Disposition. */
  fallbackName: string;
  signal?: AbortSignal;
}

/** Fetches `endpoint`, verifies the response is a file, and saves it. */
export async function downloadExport(
  endpoint: string,
  options: DownloadExportOptions,
): Promise<{ filename: string; bytes: number }> {
  let headers: Headers | null = null;

  const blob = await apiClient.download(endpoint, undefined, {
    signal: options.signal,
    onResponseHeaders: (received) => {
      headers = received;
    },
  });

  const contentType = blob.type || (headers as Headers | null)?.get("content-type") || "";
  if (NOT_AN_EXPORT.some((pattern) => pattern.test(contentType)))
    throw new NotAnExportError(options.label, contentType.split(";")[0]);

  if (blob.size === 0) throw new EmptyExportError(options.label);

  const filename =
    filenameFromDisposition((headers as Headers | null)?.get("content-disposition") ?? null) ??
    options.fallbackName;

  downloadBlob(blob, filename);
  return { filename, bytes: blob.size };
}
