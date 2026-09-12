import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

installAbortSignalPolyfill();

process.env.NEXT_PUBLIC_API_URL ??= "http://api.test";

jest.mock("sonner", () => ({
  toast: { warning: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

import { toast } from "sonner";
import { downloadCalendarExport } from "./calendar-export";

const CSV = "Title,Start\r\nStandup,2026-01-05";

type FetchImpl = typeof fetch;

const realFetch = globalThis.fetch;
const downloadCalls: string[] = [];

function csvResponse(headerPairs: Array<[string, string]>): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(headerPairs),
    blob: async () => new Blob([CSV], { type: "text/csv" }),
    json: async () => ({}),
  } as Response;
}

function exportFetch(headerPairs: Array<[string, string]>): FetchImpl {
  return (input) => {
    const url = String(input);
    if (url.includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) } as Response);
    downloadCalls.push(url);
    return Promise.resolve(csvResponse(headerPairs));
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  downloadCalls.length = 0;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: jest.fn(() => "blob:calendar-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: jest.fn(),
  });
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.restoreAllMocks();
});

describe("calendar CSV export never presents a capped file as complete", () => {
  it("warns that the file is incomplete and says how to recover the missing events", async () => {
    globalThis.fetch = exportFetch([
      ["X-Export-Truncated", "true"],
      ["X-Export-Row-Count", "500"],
    ]);

    await downloadCalendarExport("2026-01-01", "2026-10-01");

    expect(downloadCalls[0]).toContain("/calendar/export");
    expect(toast.warning).toHaveBeenCalledTimes(1);
    const [title, options] = jest.mocked(toast.warning).mock.calls[0] ?? [];
    expect(String(title)).toContain("incomplete");
    const description = String(
      options !== undefined && typeof options === "object" && "description" in options
        ? options.description
        : "",
    );
    expect(description).toContain("500 rows");
    expect(description).toContain("narrower date range");
  });

  it("stays silent when the server reports a complete export", async () => {
    globalThis.fetch = exportFetch([["X-Export-Row-Count", "12"]]);

    await downloadCalendarExport("2026-01-01", "2026-01-31");

    expect(downloadCalls).toHaveLength(1);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("still downloads the capped file it warned about", async () => {
    globalThis.fetch = exportFetch([
      ["X-Export-Truncated", "true"],
      ["X-Export-Row-Count", "500"],
    ]);

    await downloadCalendarExport("2026-01-01", "2026-10-01");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("warns even when the row count header is missing, rather than reporting success", async () => {
    globalThis.fetch = exportFetch([["X-Export-Truncated", "true"]]);

    await downloadCalendarExport("2026-01-01", "2026-10-01");

    expect(toast.warning).toHaveBeenCalledTimes(1);
  });
});
