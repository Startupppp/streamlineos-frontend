import { backendPath } from "@/test-utils/backend-repo";
import { declaredRoutes, unresolvedCalls } from "@/test-utils/backend-routes";

/**
 * Every path the banking hooks call is a route the backend declares.
 *
 * `useBankAccount` called `GET /finance/bank-accounts/{id}`.
 * `BankAccountsController` declared `GET ()`, `POST ()`,
 * `PATCH (":bankAccountId")` and `GET (":bankAccountId/transactions")` — no
 * detail read. `bank-account-detail-client.tsx` calls the hook on mount, so
 * `/accounting/banking/[bankAccountId]` always 404'd into its error state with a
 * Retry button that could never succeed. The screen could not render, ever.
 *
 * The service half already existed and was already tenant-tested
 * (`BankAccountsService.findOne`, `bank-accounts-tenant-isolation.spec.ts`);
 * only the route was missing, which is exactly the class of gap no unit test on
 * either side can see.
 *
 * ANTI-VACUITY. Both readers carry a floor. A regex that stops matching reports
 * "every path resolves" over a set it never read.
 */

const MEASURED_CALL_FLOOR = 8;
const MEASURED_ROUTE_FLOOR = 15;

const FE_HOOKS = require.resolve("../banking.ts");
const BACKEND_CONTROLLERS = [
  backendPath("src", "modules", "finance", "banking", "bank-accounts.controller.ts"),
  backendPath("src", "modules", "finance", "banking", "imports.controller.ts"),
  backendPath("src", "modules", "finance", "banking", "reconciliation.controller.ts"),
  backendPath("src", "modules", "finance", "banking", "transfers.controller.ts"),
];

describe("banking hooks — every called path is a declared backend route", () => {
  it("resolves every apiClient path in hooks/api/accounting/banking.ts", () => {
    const { calls, routes, unresolved } = unresolvedCalls(
      FE_HOOKS,
      BACKEND_CONTROLLERS,
    );

    expect(calls.length).toBeGreaterThanOrEqual(MEASURED_CALL_FLOOR);
    expect(routes.size).toBeGreaterThanOrEqual(MEASURED_ROUTE_FLOOR);
    expect(unresolved).toEqual([]);
  });

  it("the bank account detail read exists alongside the list and the transactions read", () => {
    const routes = declaredRoutes(BACKEND_CONTROLLERS);
    expect(routes.has("GET /finance/bank-accounts")).toBe(true);
    expect(routes.has("GET /finance/bank-accounts/:param")).toBe(true);
    expect(routes.has("GET /finance/bank-accounts/:param/transactions")).toBe(true);
  });
});
