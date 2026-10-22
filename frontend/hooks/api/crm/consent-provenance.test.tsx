import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useRecordConsent } from "./consent";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { scopes: {}, isOrgOwner: true }, refetch: jest.fn() }),
}));

const mockedPost = apiClient.post as jest.Mock;

function wrapperFor(client: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe("recording consent states its own provenance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ success: true });
  });

  it("always posts USER_ENTRY, whatever the caller passes", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useRecordConsent(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync({
        contactId: 42,
        input: {
          channel: "EMAIL",
          status: "OPTED_IN",
          ...({ source: "UNSUBSCRIBE_LINK" } as Record<string, unknown>),
        },
      });
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [path, body] = mockedPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/crm/consent/contacts/42");
    expect(body.source).toBe("USER_ENTRY");
  });

  it("sends the fields an operator did fill in", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useRecordConsent(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await result.current.mutateAsync({
        contactId: 7,
        input: {
          channel: "SMS",
          status: "OPTED_OUT",
          legalBasis: "CONSENT",
          sourceDetail: "Told us on the call",
          expiresAt: null,
        },
      });
    });

    const [, body] = mockedPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(body).toMatchObject({
      channel: "SMS",
      status: "OPTED_OUT",
      legalBasis: "CONSENT",
      sourceDetail: "Told us on the call",
      expiresAt: null,
      source: "USER_ENTRY",
    });
  });
});
