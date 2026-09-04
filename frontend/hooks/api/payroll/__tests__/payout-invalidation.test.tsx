import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  useImportBankReturn,
  useMarkBatchPaid,
  useMarkBatchSent,
  useMarkItemFailed,
  useMarkItemPaid,
} from "@/hooks/api/payroll/payout-batches";
import { useCloseRun, useLockRun, useReopenRun } from "@/hooks/api/payroll/approvals";
import { usePublishPayslips } from "@/hooks/api/payroll/publications";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
  useAccess: jest.fn(() => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: jest.fn(async () => ({ data: { isOrgOwner: true, scopes: {} } })),
  })),
}));

const mockedPost = apiClient.post as jest.Mock;

/**
 * Marking a batch or an item paid/sent/failed, and importing a bank return,
 * change what `GET /payroll/runs` and the payroll command centre report — a run
 * moves towards PAID and the command centre's outstanding-payout tile drops.
 *
 * `queryKeys.payroll.run(id)` is `[..., "payroll", "runs", id]` and
 * `queryKeys.payroll.runs(params)` is `[..., "payroll", "runs", params]`, so
 * they diverge at index 3. TanStack matches invalidation by key PREFIX, so
 * invalidating the narrow per-run key can never reach the list — and
 * `usePayrollRuns` carries `staleTime: 60_000`, so the operator keeps reading a
 * minute-old run status after paying the batch.
 *
 * These assertions read `isInvalidated` off the query cache rather than spying
 * on `invalidateQueries`, so they pin the observable outcome and stay true
 * whichever key shape the hook chooses.
 */

const RUN_ID = 3;
const BATCH_ID = 7;
const ITEM_ID = 11;

const RUNS_LIST_KEY = queryKeys.payroll.runs({ limit: 20 });
const RUN_KEY = queryKeys.payroll.run(RUN_ID);
const COMMAND_CENTRE_KEY = queryKeys.payroll.commandCenter("2026-01");
const BATCHES_KEY = queryKeys.payroll.bankBatches(RUN_ID);
const BATCH_KEY = queryKeys.payroll.bankBatch(BATCH_ID);
const VALIDATION_KEY = queryKeys.payroll.bankValidation(RUN_ID);

const MONTH = "2026-01";
const REPORT_PARAMS = { month: MONTH } as Record<string, unknown>;
// Every payroll report response carries a server-computed `provisional` flag —
// `run === null || !PAYROLL_LOCKED_STATUSES.includes(run.status)` — and the
// summary, register, pivot and journal surfaces render it as "Figures are
// provisional until the run is locked". Lock writes LOCKED, publish writes
// PAYSLIPS_PUBLISHED and reopen writes REOPENED, so all three flip that flag.
// The reports hang off `[..., "payroll", "reports", kind, params]`, which no
// `payroll/runs` prefix reaches, and they carry `staleTime: 60_000`.
const REPORT_KEYS = [
  queryKeys.payroll.reports("summary", REPORT_PARAMS),
  queryKeys.payroll.reports("register", REPORT_PARAMS),
  queryKeys.payroll.reports("earnings", REPORT_PARAMS),
  queryKeys.payroll.reports("deductions", REPORT_PARAMS),
  queryKeys.payroll.reports("reimbursements", REPORT_PARAMS),
  queryKeys.payroll.reports("tax", REPORT_PARAMS),
  queryKeys.payroll.reports("department-cost", REPORT_PARAMS),
  queryKeys.payroll.reports("cost-center", REPORT_PARAMS),
  queryKeys.payroll.reports("bank-payout", { month: MONTH }),
  queryKeys.payroll.reports("variance", { month: MONTH }),
  queryKeys.payroll.reports("journal", { month: MONTH }),
] as const;
// A control: the run lifecycle must not be "fixed" by sweeping the whole
// `payroll` namespace, which would refetch every unrelated payroll query on
// screen. Templates are payroll data no run transition can change.
const UNRELATED_KEY = queryKeys.payroll.templates({ limit: 20 });

function seed(client: QueryClient) {
  for (const key of [
    RUNS_LIST_KEY,
    RUN_KEY,
    COMMAND_CENTRE_KEY,
    BATCHES_KEY,
    BATCH_KEY,
    VALIDATION_KEY,
    UNRELATED_KEY,
    ...REPORT_KEYS,
  ])
    client.setQueryData(key, { seeded: true });
}

function invalidated(client: QueryClient, key: readonly unknown[]): boolean {
  return client.getQueryState(key)?.isInvalidated === true;
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function freshClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  seed(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedPost.mockResolvedValue({ success: true });
});

describe("payout mutations invalidate the run list and the command centre", () => {
  const cases: Array<[string, (client: QueryClient) => Promise<void>]> = [
    [
      "mark batch paid",
      async (client) => {
        const { result } = renderHook(() => useMarkBatchPaid(), {
          wrapper: wrapper(client),
        });
        await act(async () => {
          await result.current.mutateAsync({
            batchId: BATCH_ID,
            transactionRef: "UTR-1",
            runId: RUN_ID,
          });
        });
      },
    ],
    [
      "mark batch sent",
      async (client) => {
        const { result } = renderHook(() => useMarkBatchSent(), {
          wrapper: wrapper(client),
        });
        await act(async () => {
          await result.current.mutateAsync({ batchId: BATCH_ID, runId: RUN_ID });
        });
      },
    ],
    [
      "mark item paid",
      async (client) => {
        const { result } = renderHook(() => useMarkItemPaid(), {
          wrapper: wrapper(client),
        });
        await act(async () => {
          await result.current.mutateAsync({
            batchId: BATCH_ID,
            itemId: ITEM_ID,
            transactionRef: "UTR-2",
            runId: RUN_ID,
          });
        });
      },
    ],
    [
      "mark item failed",
      async (client) => {
        const { result } = renderHook(() => useMarkItemFailed(), {
          wrapper: wrapper(client),
        });
        await act(async () => {
          await result.current.mutateAsync({
            batchId: BATCH_ID,
            itemId: ITEM_ID,
            failureReason: "Account closed",
            runId: RUN_ID,
          });
        });
      },
    ],
    [
      "import bank return",
      async (client) => {
        const { result } = renderHook(() => useImportBankReturn(), {
          wrapper: wrapper(client),
        });
        await act(async () => {
          await result.current.mutateAsync({
            batchId: BATCH_ID,
            csv: "ref,status\nUTR-1,PAID",
            runId: RUN_ID,
          });
        });
      },
    ],
  ];

  it.each(cases)("%s reaches the runs list", async (_name, run) => {
    const client = freshClient();
    await run(client);
    expect(invalidated(client, RUNS_LIST_KEY)).toBe(true);
  });

  it.each(cases)("%s reaches the command centre", async (_name, run) => {
    const client = freshClient();
    await run(client);
    expect(invalidated(client, COMMAND_CENTRE_KEY)).toBe(true);
  });

  it.each(cases)("%s still reaches the open run and its batches", async (_name, run) => {
    const client = freshClient();
    await run(client);
    expect(invalidated(client, RUN_KEY)).toBe(true);
    expect(invalidated(client, BATCHES_KEY)).toBe(true);
    expect(invalidated(client, BATCH_KEY)).toBe(true);
  });
});

describe("locking a run invalidates its pre-flight payout surfaces", () => {
  it("reaches the bank batch list and the bank validation panel", async () => {
    const client = freshClient();
    const { result } = renderHook(() => useLockRun(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ runId: RUN_ID });
    });

    // The lock resolves the blockers the validation panel is rendering, and
    // changes which payees a new batch may instruct.
    expect(invalidated(client, VALIDATION_KEY)).toBe(true);
    expect(invalidated(client, BATCHES_KEY)).toBe(true);
    expect(invalidated(client, RUNS_LIST_KEY)).toBe(true);
  });
});

describe("run-status transitions invalidate the payroll reports family", () => {
  const transitions: Array<[string, (client: QueryClient) => Promise<void>]> = [
    [
      "lock",
      async (client) => {
        const { result } = renderHook(() => useLockRun(), { wrapper: wrapper(client) });
        await act(async () => {
          await result.current.mutateAsync({ runId: RUN_ID });
        });
      },
    ],
    [
      "reopen",
      async (client) => {
        const { result } = renderHook(() => useReopenRun(), { wrapper: wrapper(client) });
        await act(async () => {
          await result.current.mutateAsync({ runId: RUN_ID, reason: "Correction" });
        });
      },
    ],
    [
      "close",
      async (client) => {
        const { result } = renderHook(() => useCloseRun(), { wrapper: wrapper(client) });
        await act(async () => {
          await result.current.mutateAsync({ runId: RUN_ID });
        });
      },
    ],
    [
      "publish payslips",
      async (client) => {
        const { result } = renderHook(() => usePublishPayslips(), { wrapper: wrapper(client) });
        await act(async () => {
          await result.current.mutateAsync({ runId: RUN_ID });
        });
      },
    ],
  ];

  it.each(transitions)("%s reaches every payroll report", async (_name, run) => {
    const client = freshClient();
    await run(client);
    const stale = REPORT_KEYS.filter((key) => !invalidated(client, key));
    expect(stale).toEqual([]);
  });

  it.each(transitions)("%s does not sweep unrelated payroll queries", async (_name, run) => {
    const client = freshClient();
    await run(client);
    expect(invalidated(client, UNRELATED_KEY)).toBe(false);
  });
});
