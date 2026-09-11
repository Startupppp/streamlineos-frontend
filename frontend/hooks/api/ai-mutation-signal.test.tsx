import { act, renderHook, waitFor } from "@testing-library/react";
import { AllProviders } from "@/test-utils/render";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useTicketAiSummarize, useTicketDraftSuggestTitle } from "./build/ticket-ai";
import { useProjectAiSummary } from "./build/ai";
import { useLeadSummaryWithCitations } from "./crm/ai";
import { useSummarizeEnvelope } from "./sign/ai";
import { useKbArticleSummarize } from "./kb/article-ai";

installAbortSignalPolyfill();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: () => Promise.resolve({ data: { isOrgOwner: true, scopes: {} } }),
  }),
}));

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
    name: "useTicketAiSummarize",
    useDispatch: () => {
      const mutation = useTicketAiSummarize(1, 2);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useTicketDraftSuggestTitle",
    useDispatch: () => {
      const mutation = useTicketDraftSuggestTitle(1);
      return (signal) => mutation.mutateAsync({ description: "a draft", signal });
    },
  },
  {
    name: "useProjectAiSummary",
    useDispatch: () => {
      const mutation = useProjectAiSummary(1);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useLeadSummaryWithCitations",
    useDispatch: () => {
      const mutation = useLeadSummaryWithCitations();
      return (signal) => mutation.mutateAsync({ leadId: 7, signal });
    },
  },
  {
    name: "useSummarizeEnvelope",
    useDispatch: () => {
      const mutation = useSummarizeEnvelope(3);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
  {
    name: "useKbArticleSummarize",
    useDispatch: () => {
      const mutation = useKbArticleSummarize(9);
      return (signal) => mutation.mutateAsync({ signal });
    },
  },
];

describe("a threaded AI mutation puts its signal in the request, not in the body", () => {
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
    const { result } = renderHook(() => useTicketDraftSuggestTitle(1), {
      wrapper: AllProviders,
    });

    let settled: Promise<unknown> | null = null;
    await act(async () => {
      settled = result.current
        .mutateAsync({ title: "draft", signal: controller.signal })
        .catch(() => undefined);
      await Promise.resolve();
    });

    await waitFor(() => expect(requestSignal).not.toBeNull());

    expect(requestBody).toBe(JSON.stringify({ title: "draft" }));

    await act(async () => {
      controller.abort();
      await settled;
    });
  });
});
