import { renderHook } from "@testing-library/react";

interface CapturedVariables {
  format: "csv" | "json";
  content?: string;
  confirmationToken?: string;
  mode?: "atomic" | "partial";
  limit?: number;
  signal?: AbortSignal;
}

interface CapturedReport {
  summary: { imported: number; rolledBack: number };
}

interface CapturedMutation {
  permission: string;
  mutationKey: readonly unknown[];
  mutationFn(variables: CapturedVariables): Promise<unknown>;
  onSuccess?(data: CapturedReport): void;
}

const captured: CapturedMutation[] = [];

function mockCapture(entry: CapturedMutation): void {
  captured.push(entry);
}

const mockPreview = jest.fn();
const mockCommit = jest.fn();
const mockExport = jest.fn();
const mockInvalidate = jest.fn();

let mockKeyCounter = 0;

jest.mock("@/lib/idempotency-key", () => ({
  IDEMPOTENCY_HEADER: "Idempotency-Key",
  newIdempotencyKey: () => {
    mockKeyCounter += 1;
    return `key-${mockKeyCounter}`;
  },
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    permission: string,
    options: Omit<CapturedMutation, "permission">,
  ) => {
    mockCapture({ permission, ...options });
    return { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };
  },
}));

jest.mock("@/features/build/import-export/import-export-client", () => ({
  previewTicketImport: (input: unknown) => mockPreview(input),
  commitTicketImport: (input: unknown) => mockCommit(input),
  exportTickets: (input: unknown) => mockExport(input),
}));

import {
  useCommitTicketImport,
  useExportTickets,
  usePreviewTicketImport,
} from "./ticket-import-export";

const PROJECT = 7;

function lastCaptured(): CapturedMutation {
  const entry = captured[captured.length - 1];
  if (!entry) throw new Error("no mutation was registered");
  return entry;
}

beforeEach(() => {
  captured.length = 0;
  mockKeyCounter = 0;
  jest.clearAllMocks();
  mockPreview.mockResolvedValue({ confirmationToken: "token-a" });
  mockCommit.mockResolvedValue({ summary: { imported: 1, rolledBack: 0 } });
  mockExport.mockResolvedValue({ rowCount: 0 });
});

describe("usePreviewTicketImport", () => {
  it("gates the dry run on the create key, because a preview reads the project's statuses", () => {
    renderHook(() => usePreviewTicketImport(PROJECT));
    expect(lastCaptured().permission).toBe("build:tickets:create");
  });

  it("scopes its mutation key to the project, so two open projects do not share one", () => {
    renderHook(() => usePreviewTicketImport(PROJECT));
    expect(lastCaptured().mutationKey).toEqual([
      "streamlineos",
      "projects",
      "import-export",
      "preview",
      PROJECT,
    ]);
  });

  it("forwards the abort signal, which is what makes the dry run cancellable", async () => {
    const controller = new AbortController();
    renderHook(() => usePreviewTicketImport(PROJECT));

    await lastCaptured().mutationFn({
      format: "csv",
      content: "title\nShip it",
      signal: controller.signal,
    });

    expect(mockPreview).toHaveBeenCalledWith({
      projectId: PROJECT,
      format: "csv",
      content: "title\nShip it",
      signal: controller.signal,
    });
  });

  it("omits the signal key entirely when none is given, rather than sending undefined", async () => {
    renderHook(() => usePreviewTicketImport(PROJECT));

    await lastCaptured().mutationFn({ format: "csv", content: "title\nShip it" });

    expect(mockPreview).toHaveBeenCalledWith({
      projectId: PROJECT,
      format: "csv",
      content: "title\nShip it",
    });
  });
});

describe("useCommitTicketImport mints one idempotency key per confirmed file", () => {
  it("reuses the first attempt's key when the same confirmation token is retried, so the backend replays", async () => {
    renderHook(() => useCommitTicketImport(PROJECT));
    const commit = lastCaptured();
    const variables: CapturedVariables = {
      format: "csv",
      content: "title\nShip it",
      confirmationToken: "token-a",
    };

    await commit.mutationFn(variables);
    await commit.mutationFn(variables);

    expect(mockCommit).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: "key-1" }),
    );
    expect(mockCommit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: "key-1" }),
    );
  });

  it("mints a new key for a new confirmation token, because that is a different import", async () => {
    renderHook(() => useCommitTicketImport(PROJECT));
    const commit = lastCaptured();

    await commit.mutationFn({
      format: "csv",
      content: "title\nA",
      confirmationToken: "token-a",
    });
    await commit.mutationFn({
      format: "csv",
      content: "title\nB",
      confirmationToken: "token-b",
    });

    expect(mockCommit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ idempotencyKey: "key-1" }),
    );
    expect(mockCommit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ idempotencyKey: "key-2" }),
    );
  });

  it("sends the confirmation token back, which is what binds the commit to its dry run", async () => {
    renderHook(() => useCommitTicketImport(PROJECT));

    await lastCaptured().mutationFn({
      format: "csv",
      content: "title\nShip it",
      confirmationToken: "token-a",
      mode: "partial",
    });

    expect(mockCommit).toHaveBeenCalledWith({
      projectId: PROJECT,
      format: "csv",
      content: "title\nShip it",
      confirmationToken: "token-a",
      mode: "partial",
      idempotencyKey: "key-1",
    });
  });

  it("gates the commit on the create key the backend route requires", () => {
    renderHook(() => useCommitTicketImport(PROJECT));
    expect(lastCaptured().permission).toBe("build:tickets:create");
  });
});

describe("useCommitTicketImport invalidation reflects what was actually written", () => {
  it("invalidates the ticket lists once rows were imported", () => {
    renderHook(() => useCommitTicketImport(PROJECT));

    lastCaptured().onSuccess?.({ summary: { imported: 3, rolledBack: 0 } });

    expect(mockInvalidate).toHaveBeenCalledTimes(3);
  });

  it("invalidates nothing when a rolled-back import wrote no row", () => {
    renderHook(() => useCommitTicketImport(PROJECT));

    lastCaptured().onSuccess?.({ summary: { imported: 0, rolledBack: 2 } });

    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe("useExportTickets", () => {
  it("gates export on the ticket view key, not on the create key", () => {
    renderHook(() => useExportTickets(PROJECT));
    expect(lastCaptured().permission).toBe("build:tickets:view");
  });

  it("omits the limit rather than sending undefined, which the query schema would reject", async () => {
    renderHook(() => useExportTickets(PROJECT));

    await lastCaptured().mutationFn({ format: "json" });

    expect(mockExport).toHaveBeenCalledWith({ projectId: PROJECT, format: "json" });
  });

  it("sends the limit when the caller asks for a smaller file", async () => {
    renderHook(() => useExportTickets(PROJECT));

    await lastCaptured().mutationFn({ format: "csv", limit: 10 });

    expect(mockExport).toHaveBeenCalledWith({ projectId: PROJECT, format: "csv", limit: 10 });
  });
});
