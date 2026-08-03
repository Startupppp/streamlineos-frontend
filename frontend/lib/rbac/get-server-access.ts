import "server-only";

import { cache } from "react";
import { getServerAuth } from "@/lib/get-server-auth";
import { BACKEND_URL } from "@/lib/backend-url";
import type { AccessResponse } from "@/types/access";

const REQUEST_TIMEOUT_MS = 8_000;

const DENIED: AccessResponse = {
  permissions: [],
  isOrgOwner: false,
  modules: {},
  mfa: { enforced: false, satisfied: true },
};

function unwrap(body: unknown): AccessResponse | null {
  if (body === null || typeof body !== "object") return null;
  const envelope = body as Record<string, unknown>;
  const payload =
    envelope.success === true && "data" in envelope ? envelope.data : envelope;
  if (payload === null || typeof payload !== "object") return null;
  const snapshot = payload as Record<string, unknown>;
  if (!Array.isArray(snapshot.permissions)) return null;
  return snapshot as unknown as AccessResponse;
}

export const getServerAccess = cache(async (): Promise<AccessResponse> => {
  const session = await getServerAuth();
  const token = session?.backendJwt;
  if (!token) return DENIED;

  try {
    const res = await fetch(`${BACKEND_URL}/me/access`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return DENIED;
    return unwrap(await res.json()) ?? DENIED;
  } catch {
    return DENIED;
  }
});
