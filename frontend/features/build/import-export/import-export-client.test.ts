import { IDEMPOTENCY_HEADER } from "@/lib/idempotency-key";
import {
  importPreviewSchema,
  importReportSchema,
  ticketExportSchema,
} from "./import-export-contract";
import {
  commitTicketImport,
  exportTickets,
  previewTicketImport,
} from "./import-export-client";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

function mocked(): { get: jest.Mock; post: jest.Mock } {
  return (jest.requireMock("@/lib/api-client") as { apiClient: { get: jest.Mock; post: jest.Mock } })
    .apiClient;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("route scoping", () => {
  it("scopes every route to the project it was given", async () => {
    mocked().post.mockResolvedValue({});
    mocked().get.mockResolvedValue({});

    await previewTicketImport({ projectId: 7, format: "csv", content: "title" });
    await commitTicketImport({
      projectId: 7,
      format: "csv",
      content: "title",
      confirmationToken: "t",
      idempotencyKey: "k",
    });
    await exportTickets({ projectId: 7, format: "csv" });

    expect(mocked().post.mock.calls[0]?.[0]).toBe("/build/7/import-export/tickets/preview");
    expect(mocked().post.mock.calls[1]?.[0]).toBe("/build/7/import-export/tickets");
    expect(mocked().get.mock.calls[0]?.[0]).toBe("/build/7/import-export/tickets/export");
  });
});

describe("previewTicketImport", () => {
  it("posts the file to the preview route under the preview contract", async () => {
    mocked().post.mockResolvedValue({});
    await previewTicketImport({ projectId: 42, format: "csv", content: "title\nA" });

    expect(mocked().post).toHaveBeenCalledWith(
      "/build/42/import-export/tickets/preview",
      { format: "csv", content: "title\nA" },
      undefined,
      importPreviewSchema,
    );
  });

  it("forwards an abort signal", async () => {
    mocked().post.mockResolvedValue({});
    const controller = new AbortController();
    await previewTicketImport({
      projectId: 42,
      format: "json",
      content: "[]",
      signal: controller.signal,
    });

    expect(mocked().post.mock.calls[0]?.[2]).toEqual({ signal: controller.signal });
  });
});

describe("commitTicketImport", () => {
  it("sends the confirmation token and the caller's idempotency key", async () => {
    mocked().post.mockResolvedValue({});
    await commitTicketImport({
      projectId: 42,
      format: "csv",
      content: "title\nA",
      confirmationToken: "token-1",
      idempotencyKey: "key-1",
    });

    const [url, body, config, contract] = mocked().post.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { headers: Record<string, string> },
      unknown,
    ];
    expect(url).toBe("/build/42/import-export/tickets");
    expect(body).toEqual({
      format: "csv",
      content: "title\nA",
      confirmationToken: "token-1",
      mode: "atomic",
    });
    expect(config.headers[IDEMPOTENCY_HEADER]).toBe("key-1");
    expect(contract).toBe(importReportSchema);
  });

  it("does not let the transport mint a per-attempt key, so a retry replays", async () => {
    mocked().post.mockResolvedValue({});
    const input = {
      projectId: 42,
      format: "csv" as const,
      content: "title\nA",
      confirmationToken: "token-1",
      idempotencyKey: "key-1",
    };

    await commitTicketImport(input);
    await commitTicketImport(input);

    const first = mocked().post.mock.calls[0]?.[2] as { headers: Record<string, string> };
    const second = mocked().post.mock.calls[1]?.[2] as { headers: Record<string, string> };
    expect(first.headers[IDEMPOTENCY_HEADER]).toBe(second.headers[IDEMPOTENCY_HEADER]);
  });

  it("carries the partial mode through when the caller asks for it", async () => {
    mocked().post.mockResolvedValue({});
    await commitTicketImport({
      projectId: 42,
      format: "csv",
      content: "title\nA",
      confirmationToken: "token-1",
      idempotencyKey: "key-1",
      mode: "partial",
    });

    expect((mocked().post.mock.calls[0]?.[1] as { mode: string }).mode).toBe("partial");
  });
});

describe("exportTickets", () => {
  it("requests the format under the export contract", async () => {
    mocked().get.mockResolvedValue({});
    await exportTickets({ projectId: 42, format: "csv" });

    expect(mocked().get).toHaveBeenCalledWith(
      "/build/42/import-export/tickets/export",
      { format: "csv" },
      undefined,
      ticketExportSchema,
    );
  });

  it("omits the limit entirely rather than sending undefined", async () => {
    mocked().get.mockResolvedValue({});
    await exportTickets({ projectId: 42, format: "json" });
    expect(mocked().get.mock.calls[0]?.[1]).toEqual({ format: "json" });
  });

  it("sends a limit when one is given", async () => {
    mocked().get.mockResolvedValue({});
    await exportTickets({ projectId: 42, format: "csv", limit: 100 });
    expect(mocked().get.mock.calls[0]?.[1]).toEqual({ format: "csv", limit: 100 });
  });
});
