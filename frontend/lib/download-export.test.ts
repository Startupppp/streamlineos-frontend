/**
 * HRMS-E2E-013b. QA downloaded the assets export twice from an org holding eight
 * assets and got a 0-byte file both times, with a success toast both times.
 * Nothing between the fetch and the disk looked at what had arrived, so an empty
 * body, an HTML error page and a real CSV were saved the same way and announced
 * the same way.
 *
 * These assertions fail if the size and content-type checks are removed.
 */
import {
  EmptyExportError,
  NotAnExportError,
  downloadExport,
  filenameFromDisposition,
} from "./download-export";

const download = jest.fn();
jest.mock("@/lib/api-client", () => ({
  apiClient: { download: (...args: unknown[]) => download(...args) },
}));

const saved: Array<{ blob: Blob; filename: string }> = [];
jest.mock("@/lib/download-blob", () => ({
  downloadBlob: (blob: Blob, filename: string) => void saved.push({ blob, filename }),
}));

/** Stands in for a fetch that resolved with these headers and this body. */
function respondWith(body: string, type: string, headers: Record<string, string> = {}) {
  download.mockImplementation(
    async (_url: string, _params: unknown, config: { onResponseHeaders?: (h: Headers) => void }) => {
      config?.onResponseHeaders?.(new Headers({ "content-type": type, ...headers }));
      return new Blob([body], { type });
    },
  );
}

const options = { label: "Assets", fallbackName: "assets-export.csv" };

beforeEach(() => {
  download.mockReset();
  saved.length = 0;
});

describe("filenameFromDisposition", () => {
  it("reads a plain quoted filename", () => {
    expect(filenameFromDisposition('attachment; filename="assets-export-2026-09-24.csv"')).toBe(
      "assets-export-2026-09-24.csv",
    );
  });

  it("reads an unquoted filename", () => {
    expect(filenameFromDisposition("attachment; filename=assets.csv")).toBe("assets.csv");
  });

  it("prefers the RFC 5987 encoded form and decodes it", () => {
    expect(
      filenameFromDisposition("attachment; filename=\"fallback.csv\"; filename*=UTF-8''r%C3%A9sum%C3%A9.csv"),
    ).toBe("résumé.csv");
  });

  it("is null when the header is absent or carries no filename", () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition("attachment")).toBeNull();
  });
});

describe("downloadExport", () => {
  it("saves a real CSV and reports its name and size", async () => {
    respondWith("name,serial\nQA Laptop,QA-SN-0001\n", "text/csv", {
      "content-disposition": 'attachment; filename="assets-export-2026-09-24.csv"',
    });

    const result = await downloadExport("/hr/export/assets", options);

    expect(saved).toHaveLength(1);
    expect(result.filename).toBe("assets-export-2026-09-24.csv");
    expect(result.bytes).toBeGreaterThan(0);
  });

  it("refuses a zero-byte body instead of saving it", async () => {
    respondWith("", "text/csv");

    await expect(downloadExport("/hr/export/assets", options)).rejects.toBeInstanceOf(EmptyExportError);
    expect(saved).toHaveLength(0);
  });

  it("refuses an HTML error page that reached the download path", async () => {
    respondWith("<html><body>502 Bad Gateway</body></html>", "text/html");

    await expect(downloadExport("/hr/export/assets", options)).rejects.toBeInstanceOf(NotAnExportError);
    expect(saved).toHaveLength(0);
  });

  it("refuses a JSON error envelope served with a 200", async () => {
    respondWith('{"code":"MODULE_NOT_ENABLED"}', "application/json");

    await expect(downloadExport("/hr/expenses/export", options)).rejects.toBeInstanceOf(NotAnExportError);
    expect(saved).toHaveLength(0);
  });

  it("falls back to the caller's filename when the server sends no disposition", async () => {
    respondWith("name,serial\n", "text/csv");

    const result = await downloadExport("/hr/export/assets", options);
    expect(result.filename).toBe("assets-export.csv");
  });

  it("lets a rejected request surface as itself, not as a saved file", async () => {
    download.mockRejectedValue(new Error("Failed to fetch"));

    await expect(downloadExport("/hr/export/assets", options)).rejects.toThrow("Failed to fetch");
    expect(saved).toHaveLength(0);
  });

  it("saves a header-only export, which is a legitimate empty result", async () => {
    // The server now always writes a header row, so header-only means "no rows",
    // which is information — unlike zero bytes, which means "something broke".
    respondWith("name,serial,assigned_to\n", "text/csv");

    await expect(downloadExport("/hr/export/assets", options)).resolves.toBeDefined();
    expect(saved).toHaveLength(1);
  });
});
