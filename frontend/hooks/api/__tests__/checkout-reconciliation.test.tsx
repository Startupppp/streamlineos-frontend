/**
 * AB-08: the browser callback is not the only way a purchase settles. This pins the
 * bounded reconciliation poll — that it converges when the provider webhook settles the
 * term after the callback was lost, that it stops rather than polling forever when
 * nothing settles, and that it refreshes access and entitlements and not just billing.
 *
 * The subscription read is mounted in each case because that is the real shape: the poll
 * runs while the billing screen is open. A test without the observer proves nothing about
 * whether the screen actually updates.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  CHECKOUT_RECONCILIATION_ATTEMPTS,
  useAwaitCheckoutReconciliation,
} from "@/hooks/api/subscription";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

interface SubscriptionShape {
  subscription: { plan: string; status: string };
}

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeReader(settledPlan: string | null) {
  const counter = { reads: 0 };
  const queryFn = (): Promise<SubscriptionShape> => {
    counter.reads += 1;
    return Promise.resolve({
      subscription: {
        plan: settledPlan !== null && counter.reads > 1 ? settledPlan : "FREE",
        status: "ACTIVE",
      },
    });
  };
  return { counter, queryFn };
}

function useHarness(queryFn: () => Promise<SubscriptionShape>) {
  const read = useQuery({
    queryKey: growthAndSignQueryKeys.billing.subscription(),
    queryFn,
  });
  const awaitReconciliation = useAwaitCheckoutReconciliation();
  return { read, awaitReconciliation };
}

describe("useAwaitCheckoutReconciliation", () => {
  it("converges once the webhook has settled the term, and refreshes access and entitlements", async () => {
    const client = makeClient();
    const { queryFn } = makeReader("PROFESSIONAL");
    const invalidate = jest.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useHarness(queryFn), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));

    await expect(
      result.current.awaitReconciliation("PROFESSIONAL", { attempts: 4, intervalMs: 0 }),
    ).resolves.toBe(true);

    const invalidated = invalidate.mock.calls.map((call) => JSON.stringify(call[0]?.queryKey));
    expect(invalidated).toContain(JSON.stringify(growthAndSignQueryKeys.billing.entitlements()));
    expect(invalidated).toContain(JSON.stringify(platformCoreQueryKeys.access.me()));
    expect(invalidated).toContain(JSON.stringify(platformCoreQueryKeys.access.orgModules()));
  });

  it("is bounded: it gives up after its attempt budget instead of polling forever", async () => {
    const client = makeClient();
    const { counter, queryFn } = makeReader(null);

    const { result } = renderHook(() => useHarness(queryFn), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));
    const before = counter.reads;

    await expect(
      result.current.awaitReconciliation("PROFESSIONAL", { attempts: 3, intervalMs: 0 }),
    ).resolves.toBe(false);
    expect(counter.reads - before).toBe(3);
  });

  it("defaults to a bounded budget rather than an open-ended one", () => {
    expect(CHECKOUT_RECONCILIATION_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isFinite(CHECKOUT_RECONCILIATION_ATTEMPTS)).toBe(true);
  });

  it("stops on the first tick when the caller has already aborted", async () => {
    const client = makeClient();
    const { counter, queryFn } = makeReader(null);
    const controller = new AbortController();
    controller.abort();

    const { result } = renderHook(() => useHarness(queryFn), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.read.isSuccess).toBe(true));
    const before = counter.reads;

    await expect(
      result.current.awaitReconciliation("PROFESSIONAL", {
        attempts: 5,
        intervalMs: 0,
        signal: controller.signal,
      }),
    ).resolves.toBe(false);
    expect(counter.reads - before).toBe(0);
  });
});
