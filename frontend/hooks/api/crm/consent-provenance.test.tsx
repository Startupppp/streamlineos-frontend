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

/**
 * The wire half of the provenance decision.
 *
 * `contact-consent-layout.test.ts` proves the UI offers no control for `source`.
 * This proves the request carries the right one anyway — a form with no field
 * and a hook that forwarded whatever it was handed would leave the value to
 * whatever a caller passed, which is the same hole one layer down.
 *
 * `USER_ENTRY` is not a default here, it is the only truthful answer: a person
 * typing consent into this screen is a colleague entering it, and the three
 * other operator-claimable sources (IMPORT, API, ENRICHMENT) describe how a row
 * got in without anybody typing it.
 */
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
          /* A caller trying to claim the contact unsubscribed themselves. */
          ...({ source: "UNSUBSCRIBE_LINK" } as Record<string, unknown>),
        },
      });
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    const [path, body] = mockedPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/crm/consent/contacts/42");
    /*
     * The assertion that carries it. Spreading the caller's input BEFORE the
     * literal is what makes this true; the reverse order compiles, passes a test
     * that only checks the happy path, and forwards the forged value.
     */
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
      /* Null means "does not lapse" and must survive as null, not vanish. */
      expiresAt: null,
      source: "USER_ENTRY",
    });
  });
});
