/**
 * `/billing/invoices/new` is a create surface that used to inherit a read gate.
 *
 * The only gate over it was `app/(authenticated)/billing/layout.tsx`'s
 * `enforceRouteAccess("/billing/invoices")`, and the registry bound that prefix
 * to `accounting:receivables:read` — a key gating the finance AR endpoints
 * (`/accounting/ar-payments`, `/accounting/customer-statements`), not this
 * page's reads, and one that no role template grants. So the read gate denied
 * every non-owner including the ACCOUNTANT holding all four `/invoices` keys,
 * while whoever did get through reached the create form with no create gate.
 *
 * Both halves are pinned here against the routes' own declarations in
 * `contracts/openapi.json`:
 *   GET  /invoices  -> accounting:read
 *   POST /invoices  -> accounting:create
 */
import * as fs from "fs";
import * as path from "path";
import { resolveRouteAccess } from "../route-access";

function keysOf(pathname: string): string[] {
  const decision = resolveRouteAccess(pathname);
  if (decision.kind !== "permission" || !decision.permission) return [];
  return Array.isArray(decision.permission)
    ? [...decision.permission]
    : [decision.permission];
}

function contractPermission(method: string, route: string): string | undefined {
  const contract = path.join(__dirname, "..", "..", "..", "..", "contracts", "openapi.json");
  const doc = JSON.parse(fs.readFileSync(contract, "utf8")) as {
    paths?: Record<string, Record<string, { "x-permission"?: string }>>;
  };
  return doc.paths?.[route]?.[method]?.["x-permission"];
}

describe("/billing/invoices route gates match the routes they front", () => {
  it("gates the listing on the key GET /invoices declares", () => {
    const declared = contractPermission("get", "/invoices");
    expect(declared).toBe("accounting:read");
    expect(keysOf("/billing/invoices")).toEqual([declared]);
  });

  it("gates the create page on the key POST /invoices declares, not on a read key", () => {
    const declared = contractPermission("post", "/invoices");
    expect(declared).toBe("accounting:create");
    expect(keysOf("/billing/invoices/new")).toEqual([declared]);
  });

  it("does not let the create gate leak onto the listing or a detail route", () => {
    expect(keysOf("/billing/invoices")).not.toContain("accounting:create");
    expect(keysOf("/billing/invoices/42")).toEqual(["accounting:read"]);
  });

  it("no longer asks for accounting:receivables:read anywhere under /billing", () => {
    for (const route of ["/billing/invoices", "/billing/invoices/new", "/billing/invoices/42"])
      expect(keysOf(route)).not.toContain("accounting:receivables:read");
  });

  it("gates the create page from the page itself, not only from the shared layout", () => {
    const page = fs.readFileSync(
      path.join(__dirname, "..", "..", "..", "..", "app", "(authenticated)", "billing", "invoices", "new", "page.tsx"),
      "utf8",
    );
    expect(page).toContain("enforceRouteAccess");
    expect(page).toContain("/billing/invoices/new");
    expect(page).not.toContain('"use client"');
  });
});
