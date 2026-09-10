import { SignJWT } from "jose";
import { request } from "@playwright/test";
import { INTERNAL_TOKEN_AUDIENCE, INTERNAL_TOKEN_ISSUER } from "@/lib/backend-token-contract";
import { tenantEnv } from "./tenant";

/**
 * A read-only window onto the backend, used as the ORACLE for UI flows.
 *
 * The UI is what these specs drive; it is not what they trust to report the
 * result. The flow specs act through the screen and verify against the LEDGER
 * (`/inventory/stock/transactions`), because the ledger is what actually moved —
 * an endpoint that accepted the request and wrote nothing renders exactly the
 * same toast as one that worked.
 *
 * Being the oracle, everything here is typed to what the API actually sends and
 * never to what a reader assumes it sends. Getting that backwards is neither a
 * compile error nor a visible failure: a field read under the wrong name is
 * `undefined`, `Number()`s to `NaN`, and every comparison against it quietly
 * passes. It has already cost a run here — these helpers described
 * `/inventory/stock` as "raw snake_case rows with no product or location join",
 * and the endpoint returns the camelCase NESTED shape `RawStockLevel` in
 * `hooks/api/inventory/stock-levels.ts` parses field for field (the backend says
 * so at `inv-stock.service.ts`, and its `RESPONSE_SHAPE` cache-key version is at
 * "s2" because the shape has already changed once). So `row.on_hand` read
 * `undefined` and the projection assertion failed with `NaN` on a run where the
 * product was correct.
 *
 * Probe an endpoint before typing it here, and re-probe before believing a
 * comment like this one.
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
  /**
   * The write half, used ONLY to build the documents a flow needs before it can
   * be walked — a purchase order to receive against, a receipt to put away, a
   * wave to pick. Never to perform the step under test: a spec that posts the
   * command it is meant to be driving through the UI is asserting against
   * itself.
   *
   * Seeding through the API rather than by SQL insert is the point. A row
   * inserted by hand is one the domain would never have produced — wrong
   * status, missing ledger, no number sequence — and a green test standing on
   * it proves nothing about the application.
   */
  post<T>(path: string, body?: unknown): Promise<T>;
  dispose(): Promise<void>;
}

export async function apiOracle(): Promise<ApiOracle> {
  const { apiUrl } = tenantEnv();
  const token = await backendToken();
  const ctx = await request.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  function unwrap<T>(body: { success?: boolean; data?: T }): T {
    // The backend wraps success responses as `{ success, data }`; a few
    // endpoints return the payload bare. Unwrapping only the wrapped shape
    // keeps both working.
    return body?.success === true && "data" in body ? (body.data as T) : (body as T);
  }

  return {
    async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
      const res = await ctx.get(path, { params });
      if (!res.ok()) {
        throw new Error(`${path} -> ${res.status()} ${await res.text()}`);
      }
      return unwrap<T>(await res.json());
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const res = await ctx.post(path, {
        data: body ?? {},
        headers: {
          // Not optional. `@Idempotent` and `@IdempotencyKey()` make this
          // header REQUIRED, and its absence comes back as a 400 that reads
          // like a body validation failure — which sends you looking at the
          // payload for an hour.
          "Idempotency-Key": crypto.randomUUID(),
        },
      });
      if (!res.ok()) {
        throw new Error(`POST ${path} -> ${res.status()} ${await res.text()}`);
      }
      return unwrap<T>(await res.json());
    },
    dispose: () => ctx.dispose(),
  };
}

/**
 * One row of `/inventory/stock`, measured off the live endpoint.
 *
 * camelCase and NESTED — the variant and the bin arrive as objects, not as
 * `*_id` scalars. Note what is absent: the row's lot, serial, handling unit and
 * ownership are NOT projected, even though they are part of
 * `inv_stock_levels`' key. That is why `onHandFor` below cannot name a grain.
 */
export interface StockGrain {
  id: number;
  onHand: string;
  /** Held by a reservation. */
  committed: string;
  available: string;
  productVariant: { id: number; sku: string } | null;
  location: { id: number; name: string } | null;
}

/**
 * On-hand at one (variant, location), which is NOT a unique grain.
 *
 * `inv_stock_levels` is keyed wider than variant and location — lot, serial,
 * handling unit and ownership complete it — so one bin legitimately holds several
 * rows for the same SKU, and the seeded capacity tenant has exactly that: two
 * rows for variant 382 in "Free bin". The projection returns none of those four
 * columns, so the grain a given ledger movement belongs to is not addressable
 * from here.
 *
 * `items[0]` is therefore the most-recently-updated row (the list is ordered
 * `updatedAt DESC`), which right after a write is the row that was written. That
 * holds for a spec asserting its own write and is worth knowing the edge of: in a
 * tenant another suite is writing to concurrently, the newest row may be theirs,
 * and this then compares one movement's balance against a different grain's.
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
  return row ? Number(row.onHand) : 0;
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

/**
 * Everything currently in a bin, across every variant, lot and grain — which is
 * what a bin's `capacity` is counted against.
 *
 * Summing the wrong field name returned `NaN`, and `capacity - NaN >= qty` is
 * false, so `findLocationWithHeadroom` rejected every capped bin and fell through
 * to an uncapped one. It reached a usable bin anyway, which is exactly why it went
 * unnoticed: broken arithmetic producing the right answer.
 */
export async function binOccupancy(api: ApiOracle, locationId: number): Promise<number> {
  const res = await api.get<{ items: StockGrain[] }>("/inventory/stock", {
    locationId,
    page: 1,
    limit: 200,
  });
  return (res.items ?? []).reduce((sum, row) => sum + Number(row.onHand), 0);
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
  /**
   * What the movement was posted FOR — `inv_grn`, `inv_stock_transfer`, and so
   * on, with the document's own id. It is what turns "a receipt-shaped row
   * exists" into "THIS receipt's row exists", which matters in a tenant several
   * suites are writing to.
   */
  referenceType: string | null;
  referenceId: string | null;
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

/**
 * The movement a named document posted at a named bin.
 *
 * Addressed by `referenceId` rather than by "the newest row of the right type",
 * which is the assertion that quietly passes on somebody else's write: this
 * tenant is shared, the adjust spec posts to the same variant, and "an
 * ADJUSTMENT_IN exists" was already true before the click.
 */
export function movementFor(
  ledger: LedgerEntry[],
  match: { referenceType: string; referenceId: number; locationId: number; transactionType: string },
): LedgerEntry | undefined {
  return ledger.find(
    (row) =>
      row.referenceType === match.referenceType &&
      row.referenceId === String(match.referenceId) &&
      row.locationId === match.locationId &&
      row.transactionType === match.transactionType,
  );
}

/** How the ledger rows read, for a failure message somebody can act on. */
export function describeLedger(ledger: LedgerEntry[]): string {
  return JSON.stringify(
    ledger.map((r) => [r.transactionType, r.locationId, r.quantityChange, r.referenceType, r.referenceId]),
  );
}

export interface Reservation {
  id: number;
  sourceType: string;
  sourceId: string;
  sourceLineId: string | null;
  productVariantId: number;
  locationId: number | null;
  reservedQty: string;
  status: "ACTIVE" | "CONSUMED" | "RELEASED" | "EXPIRED";
}

/**
 * One order's reservation, in a given state.
 *
 * The endpoint filters by variant and status but not by source, and it imposes
 * no ordering, so the row is found by paging rather than by trusting the first
 * page — a tenant that has run this suite fifty times has fifty consumed
 * reservations for the same variant, and "it was on page one last week" is not
 * a contract.
 */
export async function reservationFor(
  api: ApiOracle,
  match: { variantId: number; soId: number; status: Reservation["status"] },
  maxPages = 5,
): Promise<Reservation | undefined> {
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await api.get<{ items: Reservation[]; totalPages: number }>(
      "/inventory/stock/reservations",
      { variantId: match.variantId, status: match.status, page, limit: 100 },
    );
    const hit = (res.items ?? []).find(
      (row) => row.sourceType === "inv_sales_order" && row.sourceId === String(match.soId),
    );
    if (hit) return hit;
    if (page >= (res.totalPages ?? 1)) break;
  }
  return undefined;
}
