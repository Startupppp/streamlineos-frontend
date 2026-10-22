import { QueryClient } from "@tanstack/react-query";
import { invalidateSettledPurchase } from "@/hooks/api/subscription";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

describe("invalidateSettledPurchase", () => {
  it("invalidates all billing, entitlement, access and plan catalog keys", () => {
    const client = makeClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");

    invalidateSettledPurchase(client);

    const invalidated = invalidate.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey),
    );

    expect(invalidated).toContain(
      JSON.stringify(growthAndSignQueryKeys.billing.subscription()),
    );
    expect(invalidated).toContain(
      JSON.stringify(growthAndSignQueryKeys.billing.summary()),
    );
    expect(invalidated).toContain(
      JSON.stringify(growthAndSignQueryKeys.billing.entitlements()),
    );
    expect(invalidated).toContain(
      JSON.stringify(growthAndSignQueryKeys.billing.seats()),
    );
    expect(invalidated).toContain(
      JSON.stringify(growthAndSignQueryKeys.billing.plans()),
    );
    expect(invalidated).toContain(
      JSON.stringify(platformCoreQueryKeys.access.me()),
    );
    expect(invalidated).toContain(
      JSON.stringify(platformCoreQueryKeys.access.orgModules()),
    );
  });
});
