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

type SuccessEnvelope = { success: true; data: unknown };

function isSuccessEnvelope(body: unknown): body is SuccessEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success === true &&
    "data" in body
  );
}

export async function apiOracle(): Promise<ApiOracle> {
  const { apiUrl } = tenantEnv();
  const token = await backendToken();
  const ctx = await request.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });

  function unwrap<T>(body: unknown): T {
    // The backend wraps success responses as `{ success, data }`; a few
    // endpoints return the payload bare. Unwrapping only the wrapped shape
    // keeps both working.
    if (isSuccessEnvelope(body)) {
      return body.data as T;
    }
    return body as T;
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
