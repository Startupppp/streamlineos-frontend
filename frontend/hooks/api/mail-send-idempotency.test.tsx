import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import { ApiError } from "@/lib/api-envelope";
import type { AccessResponse } from "@/types/access";
import type { RequestConfig } from "@/lib/api-client";
import type { ReplyMailBody, SendMailBody } from "@/types/mail";

/**
 * The defect this pins: the idempotency key was minted inside the transport,
 * once per HTTP call. So pressing Retry after a send timed out issued a
 * genuinely new send, and the recipient got two emails — the backend's replay
 * machinery was working, it was simply never handed the same key twice.
 *
 * A key that changes on retry is not an idempotency key, it is a request id.
 */

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import { useSendMail, useReplyMail } from "@/hooks/api/mail";

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const ACCESS: AccessResponse = {
  scopes: { "mail:messages:send": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { mail: true },
};

function keysSent(): string[] {
  return post.mock.calls.map((call) => {
    const config = call[2] as RequestConfig | undefined;
    const key = config?.headers?.["Idempotency-Key"];
    if (typeof key !== "string") throw new Error("no Idempotency-Key was sent");
    return key;
  });
}

function newClient(): QueryClient {
  const client = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const DRAFT: SendMailBody = {
  accountId: 1,
  to: ["someone@example.test"],
  subject: "Q3 numbers",
  bodyHtml: "attached",
};

const OTHER_DRAFT = { ...DRAFT, subject: "Q4 numbers" };

async function send<TBody>(
  result: { current: { mutateAsync: (body: TBody) => Promise<unknown> } },
  body: TBody,
): Promise<void> {
  await act(async () => {
    await result.current.mutateAsync(body).catch(() => undefined);
  });
}

beforeEach(() => {
  post.mockReset();
});

describe("a retried send replays instead of sending twice", () => {
  it("sends the same idempotency key when the first attempt timed out", async () => {
    post
      .mockRejectedValueOnce(new ApiError("Request timed out. Please try again.", undefined, "TIMEOUT"))
      .mockResolvedValueOnce({ messageId: "m-1" });

    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(newClient()),
    });

    await send(result, DRAFT);
    await send(result, DRAFT);

    const keys = keysSent();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it("holds the key across several failed attempts, not just the first retry", async () => {
    post.mockRejectedValue(new ApiError("Network error", undefined, "NETWORK_ERROR"));

    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(newClient()),
    });

    await send(result, DRAFT);
    await send(result, DRAFT);
    await send(result, DRAFT);

    const keys = keysSent();
    expect(new Set(keys).size).toBe(1);
  });

  it("does the same for a reply", async () => {
    post
      .mockRejectedValueOnce(new ApiError("Request timed out.", undefined, "TIMEOUT"))
      .mockResolvedValueOnce({ messageId: "m-2" });

    const { result } = renderHook(() => useReplyMail(), {
      wrapper: wrapperFor(newClient()),
    });

    const reply: ReplyMailBody = { accountId: 1, messageId: "m-0", bodyHtml: "thanks" };
    await send(result, reply);
    await send(result, reply);

    const keys = keysSent();
    expect(keys[0]).toBe(keys[1]);
  });
});

describe("but two genuinely distinct sends are two operations", () => {
  it("mints a new key once a send has completed", async () => {
    post.mockResolvedValue({ messageId: "m-1" });

    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(newClient()),
    });

    await send(result, DRAFT);
    await send(result, DRAFT);

    const keys = keysSent();
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("mints a new key for a different draft, even after a failure", async () => {
    post.mockRejectedValue(new ApiError("Network error", undefined, "NETWORK_ERROR"));

    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(newClient()),
    });

    await send(result, DRAFT);
    await send(result, OTHER_DRAFT);

    const keys = keysSent();
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("never sends an empty key — an @Idempotent route 400s without the header", async () => {
    post.mockResolvedValue({ messageId: "m-1" });

    const { result } = renderHook(() => useSendMail(), {
      wrapper: wrapperFor(newClient()),
    });

    await send(result, DRAFT);

    expect(keysSent()[0]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
