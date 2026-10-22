import { SignJWT } from "jose";
import { request } from "@playwright/test";
import { INTERNAL_TOKEN_AUDIENCE, INTERNAL_TOKEN_ISSUER } from "@/lib/backend-token-contract";
import { tenantEnv } from "./tenant";

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
