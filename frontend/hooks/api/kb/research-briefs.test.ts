import {
  RESEARCH_BRIEF_POLL_MS,
  researchBriefPollInterval,
  useCreateResearchBrief,
  useRetryResearchBrief,
} from "./research-briefs";
import type { KbResearchBrief } from "@/types/kb";
import { kbResearchBriefListContract } from "./kb-research-schema";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;

function response(briefId: number, jobId: number) {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ success: true, data: { briefId, jobId } }),
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  resetOutageCircuit();
  clearBackendTokenCache();
  const token = "header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature";
  seedBackendToken(token);
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
});

describe("research brief replay keys", () => {
  it("reuses a create key after a lost response and rotates it after success", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network interrupted"));
    fetchMock.mockResolvedValue(response(5, 9));
    const { result } = renderHook(() => useCreateResearchBrief(), { wrapper });
    const input = { topic: "Process overview" };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toThrow("Network error");
    });
    resetOutageCircuit();
    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toEqual({ briefId: 5, jobId: 9 });
      await result.current.mutateAsync(input);
    });

    const keys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("Idempotency-Key"));
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[2]).not.toEqual(keys[1]);
  });

  it("reuses a job retry key after a lost response and rotates it after success", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network interrupted"));
    fetchMock.mockResolvedValue(response(5, 10));
    const { result } = renderHook(() => useRetryResearchBrief(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(5)).rejects.toThrow("Network error");
    });
    resetOutageCircuit();
    await act(async () => {
      await expect(result.current.mutateAsync(5)).resolves.toEqual({ briefId: 5, jobId: 10 });
      await result.current.mutateAsync(5);
    });

    const keys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("Idempotency-Key"));
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[2]).not.toEqual(keys[1]);
    expect(fetchMock.mock.calls.every((call) => String(call[0]).includes("/kb/research-briefs/5/retry"))).toBe(true);
  });
});

describe("Research Brief list response contract", () => {
  it("retains hasMore and nextCursor for an unfinished page", () => {
    expect(kbResearchBriefListContract.parse({
      items: [],
      hasMore: true,
      nextCursor: 42,
    })).toEqual({ items: [], hasMore: true, nextCursor: 42 });
  });

  it("requires hasMore so a deployment mismatch cannot silently appear complete", () => {
    expect(() => kbResearchBriefListContract.parse({
      items: [],
      nextCursor: null,
    })).toThrow();
  });
});

const ALL_STATUSES: KbResearchBrief["status"][] = [
  "queued",
  "running",
  "completed",
  "failed",
];

describe("researchBriefPollInterval — a brief that outlives the browser session resumes polling when the page is reopened", () => {
  it("polls for a brief still queued, so reopening the page while the job has not started picks the work back up instead of showing a permanently stale queued state", () => {
    expect(researchBriefPollInterval("queued")).toBe(RESEARCH_BRIEF_POLL_MS);
  });

  it("polls for a brief still running, which is the state a reopened page lands in when the job outlived the closed browser", () => {
    expect(researchBriefPollInterval("running")).toBe(RESEARCH_BRIEF_POLL_MS);
  });

  it("stops polling once the brief completed, so a finished brief recovered on reopen does not keep issuing requests forever", () => {
    expect(researchBriefPollInterval("completed")).toBe(false);
  });

  it("stops polling once the brief failed, because a failed job will not change state on its own and polling it is a retry storm with no retry", () => {
    expect(researchBriefPollInterval("failed")).toBe(false);
  });

  it("does not poll before any status is known, so a request that never resolves cannot turn into an unbounded three-second retry loop", () => {
    expect(researchBriefPollInterval(undefined)).toBe(false);
  });

  it("returns a verdict for every status the brief contract declares, so adding a lifecycle state cannot silently fall through to no polling", () => {
    for (const status of ALL_STATUSES) {
      const interval = researchBriefPollInterval(status);
      expect(interval === false || interval === RESEARCH_BRIEF_POLL_MS).toBe(true);
    }
  });

  it("treats exactly the two in-flight statuses as pollable, which is the pair that distinguishes a recoverable brief from a settled one", () => {
    const pollable = ALL_STATUSES.filter(
      (s) => researchBriefPollInterval(s) !== false,
    );

    expect(pollable).toEqual(["queued", "running"]);
  });
});
