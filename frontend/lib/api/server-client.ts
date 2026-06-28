import "server-only";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

async function mintBackendToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id || !session.orgId) return null;
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) return null;
  return new SignJWT({
    orgId: session.orgId,
    branchId: session.branchId ?? null,
    role: session.user.role,
    permissions: session.permissions ?? [],
    enabledModules: session.enabledModules ?? [],
    plan: session.plan ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    isOrgOwner: session.user.isOrgOwner === true,
    sessionId: session.sessionId ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(secret));
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  if (!BACKEND) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  const url = new URL(`${BACKEND}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const token = await mintBackendToken();
  if (!token) throw new Error("Unauthorized: no backend session");
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function publicRequest<T>(method: string, path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const serverApiClient = {
  get: <T>(path: string, params?: Record<string, unknown>) => request<T>("GET", path, undefined, params),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => request<T>("DELETE", path, body),
};

export const serverPublicFetch = {
  get: <T>(path: string, params?: Record<string, unknown>) => publicRequest<T>("GET", path, undefined, params),
  post: <T>(path: string, body?: unknown) => publicRequest<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => publicRequest<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => publicRequest<T>("PUT", path, body),
  delete: <T>(path: string, body?: unknown) => publicRequest<T>("DELETE", path, body),
};
