/**
 * `GET /accounting/accounts` caps a page at 100 rows — `pageSizeField(20, 100)`
 * against `PAGE_SIZE_CAP = 100`, and the field CLAMPS rather than rejects, so a
 * client asking for more is silently answered with 100 and no error.
 *
 * Every account selector in `features/accounting/**` used to read one page of
 * that endpoint and drop `pagination.nextCursor`. For an org whose chart of
 * accounts runs past 100 rows that made accounts 101+ unselectable in a journal
 * entry, an opening balance, a recurring journal, a bank-account GL mapping, an
 * asset-category mapping and the finance settings dialogs — and made
 * `AccountDetailPage` render "Account not found" for an account that exists,
 * because it resolves the account by scanning that same single page.
 *
 * `useAllAccounts` follows the cursor to the end of the chart. These tests
 * drive its `queryFn` against a paged fake of the endpoint.
 */
import { useQuery } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient, type QueryParams } from "@/lib/api-client";
import { useAccounts, useAllAccounts, type CursorPage } from "../../accounting";
import type { Account } from "@/types/accounting";

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQuery: jest.fn((options: unknown) => options),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
  useMutation: jest.fn(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  usePermissionGate: jest.fn(() => ({ allowed: true, resolved: true })),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockQuery = jest.mocked(useQuery);
const mockCan = jest.mocked(useCan);
const mockGet = jest.mocked(apiClient.get);

const PAGE_CAP = 100;

const EPOCH = "2026-01-01T00:00:00.000Z";

function account(id: number): Account {
  return {
    id,
    orgId: "org_1",
    code: String(1000 + id),
    name: `Account ${id}`,
    accountType: "EXPENSE",
    parentAccountId: null,
    isActive: true,
    normalBalance: "DEBIT",
    isSystem: false,
    description: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
  };
}

/**
 * A faithful stand-in for the endpoint: it never returns more than PAGE_CAP
 * rows however large a `limit` the caller asks for, exactly as `pageSizeField`
 * clamps on the server.
 */
function serveChart(total: number): Account[] {
  const chart = Array.from({ length: total }, (_, i) => account(i + 1));
  mockGet.mockImplementation((_url: string, params?: QueryParams) => {
    const cursor = params ? Reflect.get(params, "cursor") : undefined;
    const limit = params ? Reflect.get(params, "limit") : undefined;
    const start = cursor === undefined ? 0 : Number(cursor);
    const size = Math.min(limit === undefined ? PAGE_CAP : Number(limit), PAGE_CAP);
    const slice = chart.slice(start, start + size);
    const nextStart = start + slice.length;
    const hasMore = nextStart < chart.length;
    return Promise.resolve({
      data: slice,
      pagination: { limit: size, hasMore, nextCursor: hasMore ? String(nextStart) : null },
    });
  });
  return chart;
}

type AccountsQueryFn = (ctx: { signal?: AbortSignal }) => Promise<CursorPage<Account>>;

/**
 * `useQuery` is mocked to the identity above, so the hook's own options object
 * is the recorded argument. Narrowed by a type guard rather than a cast: a hook
 * that stopped passing a `queryFn` fails here instead of silently typing as one.
 */
function hasQueryFn(value: unknown): value is { queryFn: AccountsQueryFn } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "queryFn") === "function"
  );
}

function captureQueryFn(run: () => void): AccountsQueryFn {
  run();
  const options = mockQuery.mock.calls.at(-1)?.[0];
  if (!hasQueryFn(options)) throw new Error("hook did not pass a queryFn to useQuery");
  return options.queryFn;
}

describe("account reads reach the whole chart of accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
  });

  it("useAccounts is capped at one page — the defect this exists to bound", async () => {
    serveChart(150);
    const queryFn = captureQueryFn(() => useAccounts({ limit: 100 }));
    const page = await queryFn({});

    expect(page.data).toHaveLength(PAGE_CAP);
    expect(page.pagination.hasMore).toBe(true);
  });

  it("useAllAccounts returns account 101 and beyond", async () => {
    serveChart(150);
    const queryFn = captureQueryFn(() => useAllAccounts());
    const page = await queryFn({});

    expect(page.data).toHaveLength(150);
    expect(page.data.map((a) => a.id)).toContain(101);
    expect(page.data.map((a) => a.id)).toContain(150);
    expect(page.pagination.hasMore).toBe(false);
    expect(page.pagination.nextCursor).toBeNull();
  });

  it("issues exactly one request when the chart fits in a page", async () => {
    serveChart(49);
    const queryFn = captureQueryFn(() => useAllAccounts());
    const page = await queryFn({});

    expect(page.data).toHaveLength(49);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("forwards the abort signal on every page, not just the first", async () => {
    serveChart(250);
    const signal = new AbortController().signal;
    const queryFn = captureQueryFn(() => useAllAccounts());
    await queryFn({ signal });

    expect(mockGet).toHaveBeenCalledTimes(3);
    for (const call of mockGet.mock.calls) {
      expect(call[2]).toBe(signal);
    }
  });

  it("passes the caller's filters through to every page", async () => {
    serveChart(150);
    const queryFn = captureQueryFn(() => useAllAccounts({ activeOnly: true, type: "EXPENSE" }));
    await queryFn({});

    for (const call of mockGet.mock.calls) {
      expect(call[1]).toMatchObject({ activeOnly: "true", type: "EXPENSE" });
    }
  });

  it("stops at the page ceiling and reports the truncation instead of hiding it", async () => {
    serveChart(5_000);
    const queryFn = captureQueryFn(() => useAllAccounts());
    const page = await queryFn({});

    expect(page.data.length).toBeLessThan(5_000);
    expect(page.pagination.hasMore).toBe(true);
    expect(page.pagination.nextCursor).not.toBeNull();
  });

  it("does not loop forever if the server claims hasMore with no cursor", async () => {
    mockGet.mockResolvedValue({
      data: [account(1)],
      pagination: { limit: 100, hasMore: true, nextCursor: null },
    });
    const queryFn = captureQueryFn(() => useAllAccounts());
    const page = await queryFn({});

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(page.data).toHaveLength(1);
  });
});
