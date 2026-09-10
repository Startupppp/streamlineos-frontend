import { SignJWT } from "jose";
import { request } from "@playwright/test";
import { INTERNAL_TOKEN_AUDIENCE, INTERNAL_TOKEN_ISSUER } from "@/lib/backend-token-contract";
import { tenantEnv } from "./tenant";

/**
 * A read-only window onto the backend, used as the ORACLE for UI flows.
 *
 * The UI is what these specs drive; it is not always what they can trust to
 * report the result. `GET /inventory/stock` returns raw snake_case rows with no
 * product or location join, while the frontend maps `onHand`, `productVariant`
 * and `location` — so the Stock Levels table renders `NaN` for on-hand and `—`
 * for every name, and reading a quantity off that screen would mean asserting
 * against a known-broken projection.
 *
 * The ledger does not have that problem: `/inventory/stock/transactions`
 * returns the camelCase, joined shape the frontend expects. So the flow specs
 * act through the UI and verify against the ledger, which is also the more
 * honest oracle — the ledger is what actually moved.
 */

/**
 * The same claims `lib/auth.ts` signs into `session.backendJwt`. Issuer and
 * audience come from the shared contract module rather than being retyped: the
 * backend rejects a mismatch with a plain 401, which reads as bad credentials
 * rather than as a typo.
 */
async function backendToken(): Promise<string> {
  const { user } = tenantEnv();
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) throw new Error("BACKEND_JWT_SECRET is unset; the API oracle cannot authenticate.");

  return new SignJWT({ orgId: user.orgId, sessionId: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuer(INTERNAL_TOKEN_ISSUER)
    .setAudience(INTERNAL_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(new TextEncoder().encode(secret));
}

export interface ApiOracle {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T>;
  dispose(): Promise<void>;
}

export async function apiOracle(): Promise<ApiOracle> {
  const { apiUrl } = tenantEnv();
  const token = await backendToken();
  const ctx = await request.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  return {
    async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
      const res = await ctx.get(path, { params });
      if (!res.ok()) {
        throw new Error(`${path} -> ${res.status()} ${await res.text()}`);
      }
      const body = (await res.json()) as { success?: boolean; data?: T };
      // The backend wraps success responses as `{ success, data }`; a few
      // endpoints return the payload bare. Unwrapping only the wrapped shape
      // keeps both working.
      return body?.success === true && "data" in body ? (body.data as T) : (body as T);
    },
    dispose: () => ctx.dispose(),
  };
}

export interface StockGrain {
  id: number;
  product_variant_id: number;
  location_id: number;
  on_hand: string;
}

/**
 * On-hand for one (variant, location) grain, read straight from the levels
 * endpoint in its real snake_case shape.
 *
 * Deliberately typed to what the API actually sends rather than to what the
 * frontend wishes it sent. This is the oracle: if it were written against the
 * camelCase contract it would read `undefined`, `Number()` it to `NaN`, and
 * every comparison against it would quietly pass.
 */
export async function onHandFor(
  api: ApiOracle,
  variantId: number,
  locationId: number,
): Promise<number> {
  const res = await api.get<{ items: StockGrain[] }>("/inventory/stock", {
    variantId,
    locationId,
    page: 1,
    limit: 50,
  });
  const row = res.items?.[0];
  return row ? Number(row.on_hand) : 0;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface WarehouseLocation {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  locationType: string;
  /** Total units the bin may hold. `null` means unlimited. */
  capacity: string | null;
}

export interface PutTarget {
  warehouseName: string;
  locationName: string;
  locationId: number;
}

/**
 * A warehouse and bin that can actually accept `qty` more units.
 *
 * Not "the first one in the list", which is how this spec first failed: bins
 * carry a `capacity` and the backend rejects an over-fill with
 * `LOCATION_CAPACITY_EXCEEDED`. A tenant seeded by other suites is full of
 * deliberately adversarial bins — the first one here is a capacity probe capped
 * at 100 and already holding exactly 100 — so a spec that takes whatever comes
 * first is testing the fixture's ordering, and fails on a business rule that
 * has nothing to do with the flow under test.
 *
 * Names, not ids, because the UI's comboboxes are driven by their visible
 * labels and those labels are the warehouse and location names.
 */
export async function findLocationWithHeadroom(
  api: ApiOracle,
  qty: number,
): Promise<PutTarget> {
  const warehouses = await api.get<Warehouse[]>("/inventory/warehouses");
  const tried: string[] = [];

  for (const warehouse of warehouses.filter((w) => w.isActive)) {
    const locations = await api.get<WarehouseLocation[]>(
      `/inventory/warehouses/${warehouse.id}/locations`,
    );

    for (const location of locations.filter((l) => l.isActive && l.locationType === "BIN")) {
      if (location.capacity === null) {
        return { warehouseName: warehouse.name, locationName: location.name, locationId: location.id };
      }

      // A capped bin still qualifies if the whole bin — every variant and lot
      // in it, which is what the cap counts — leaves room for `qty`.
      const held = await binOccupancy(api, location.id);
      if (Number(location.capacity) - held >= qty) {
        return { warehouseName: warehouse.name, locationName: location.name, locationId: location.id };
      }
      tried.push(`${location.name}(${held}/${location.capacity})`);
    }
  }

  throw new Error(
    `No active bin can accept ${qty} more units. Tried: ${tried.join(", ") || "(none)"}. ` +
      `Seed a bin with spare capacity, or lower the quantity under test.`,
  );
}

/** Everything currently in a bin, across every variant and lot. */
async function binOccupancy(api: ApiOracle, locationId: number): Promise<number> {
  const res = await api.get<{ items: StockGrain[] }>("/inventory/stock", {
    locationId,
    page: 1,
    limit: 200,
  });
  return (res.items ?? []).reduce((sum, row) => sum + Number(row.on_hand), 0);
}

export interface LedgerEntry {
  id: number;
  transactionType: string;
  quantityChange: string;
  quantityBefore: string;
  quantityAfter: string;
  productVariantId: number;
  locationId: number;
  reason: string | null;
}

/** The most recent ledger rows for a grain, newest first. */
export async function recentLedger(
  api: ApiOracle,
  variantId: number,
  limit = 5,
): Promise<LedgerEntry[]> {
  const res = await api.get<{ items: LedgerEntry[] }>("/inventory/stock/transactions", {
    productVariantId: variantId,
    page: 1,
    limit,
  });
  return res.items ?? [];
}
