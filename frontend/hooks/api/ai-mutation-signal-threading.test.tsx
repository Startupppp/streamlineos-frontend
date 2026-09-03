import { act, renderHook, waitFor } from "@testing-library/react";
import { AllProviders } from "@/test-utils/render";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useAnalyzeTicket, useImproveReply, useTranslateMessage } from "./support/ai";
import { useKbPageSummarize } from "./kb/page-ai";
import { useKbAsk } from "./kb/ask";
import { useMailThreadSummary } from "./mail";
import { useExplainVariance } from "./accounting/accounting-ai";
import { useExplainPayslip } from "./payroll/use-explain-payslip";
import { useGenerateEmail } from "./ai";

installAbortSignalPolyfill();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: () => Promise.resolve({ data: { isOrgOwner: true, scopes: {} } }),
  }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;
let requestBody: string | null;

beforeEach(() => {
  requestSignal = null;
  requestBody = null;
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    if (String(input).includes("/api/auth/session"))
      return Promise.resolve({ ok: false, status: 401 });
    requestSignal = init?.signal ?? null;
    requestBody = typeof init?.body === "string" ? init.body : null;
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  });
  Object.assign(globalThis, { fetch: fetchMock });
});

afterAll(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

interface Family {
  name: string;
  useDispatch: () => (signal: AbortSignal) => Promise<unknown>;
}

const FAMILIES: Family[] = [
  {
    name: "useAnalyzeTicket",
    useDispatch: () => {
      const mutation = useAnalyzeTicket(4);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useTranslateMessage",
    useDispatch: () => {
      const mutation = useTranslateMessage(4);
      return (signal) => mutation.mutateAsync({ messageId: 2, targetLanguage: "fr", signal });
    },
  },
  {
    name: "useImproveReply",
    useDispatch: () => {
      const mutation = useImproveReply(4);
      return (signal) => mutation.mutateAsync({ content: "a draft", signal });
    },
  },
  {
    name: "useKbPageSummarize",
    useDispatch: () => {
      const mutation = useKbPageSummarize(11);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useKbAsk",
    useDispatch: () => {
      const mutation = useKbAsk();
      return (signal) => mutation.mutateAsync({ question: "what?", signal });
    },
  },
  {
    name: "useMailThreadSummary",
    useDispatch: () => {
      const mutation = useMailThreadSummary();
      return (signal) => mutation.mutateAsync({ accountId: 1, threadId: "t1", signal });
    },
  },
  {
    name: "useExplainVariance",
    useDispatch: () => {
      const mutation = useExplainVariance();
      return (signal) =>
        mutation.mutateAsync({
          periodLabel: "2026-09",
          accountName: "Travel",
          accountCode: "6100",
          budgetAmount: 100,
          actualAmount: 140,
          varianceAmount: 40,
          variancePct: 40,
          signal,
        });
    },
  },
  {
    name: "useExplainPayslip",
    useDispatch: () => {
      const mutation = useExplainPayslip(5);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useGenerateEmail",
    useDispatch: () => {
      const mutation = useGenerateEmail();
      return (signal) => mutation.mutateAsync({ leadName: "Ada", signal });
    },
  },
];

describe("the AI mutations threaded in this pass reach the request with their signal", () => {
  it.each(FAMILIES)(
    "$name forwards the caller's signal to the outgoing request",
    async ({ useDispatch }) => {
      const controller = new AbortController();
      const { result } = renderHook(useDispatch, { wrapper: AllProviders });

      let settled: Promise<unknown> | null = null;
      await act(async () => {
        settled = result.current(controller.signal).catch(() => undefined);
        await Promise.resolve();
      });

      await waitFor(() => expect(requestSignal).not.toBeNull());
      expect(requestSignal?.aborted).toBe(false);

      await act(async () => {
        controller.abort();
        await settled;
      });

      expect(requestSignal?.aborted).toBe(true);
    },
  );

  it("never serialises the AbortSignal into the request body", async () => {
    const controller = new AbortController();
    const { result } = renderHook(() => useMailThreadSummary(), {
      wrapper: AllProviders,
    });

    let settled: Promise<unknown> | null = null;
    await act(async () => {
      settled = result.current
        .mutateAsync({ accountId: 1, threadId: "t1", signal: controller.signal })
        .catch(() => undefined);
      await Promise.resolve();
    });

    await waitFor(() => expect(requestSignal).not.toBeNull());

    expect(requestBody).toBe(JSON.stringify({ accountId: 1, threadId: "t1" }));

    await act(async () => {
      controller.abort();
      await settled;
    });
  });
});
