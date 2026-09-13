/**
 * Pins the full set of keys that invalidateSettledPurchase must bust.
 *
 * A settled purchase changes plan entitlements, seat counts, billing state AND
 * the available plan catalog: if a customer upgrades from FREE to PROFESSIONAL
 * and the plans key stays cached, the upgrade modal may still show their old
 * plan as "current" for up to 60 minutes (billing.plans() staleTime).
 *
 * This test fails if any key is removed from the invalidator, biting in the
 * direction the production defect ran: the plans key was absent.
 */
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
