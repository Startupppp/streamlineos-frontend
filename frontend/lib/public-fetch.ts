import type { z } from "zod";
import type {
  publicKbListContract,
  publicKbArticleContract,
  publicApplicationStatusContract,
  publicOfferDetailContract,
  publicReferrerPortalContract,
  publicVendorPortalContract,
} from "@/lib/public-schema";
import "server-only";
import { BACKEND_URL } from "@/lib/backend-url";
import { parseApiResponse, type ResponseContract } from "@/lib/api-envelope";
import { withCorrelation, withTraceContext } from "@/lib/observability/with-correlation";

const TIMEOUT_MS = 8_000;
export const PUBLIC_REVALIDATE_SECS = 60;

export interface PublicOrgInfo {
  name: string;
  logo: string | null;
}

export type PublicKbListData = z.infer<typeof publicKbListContract>;

export type PublicKbArticle = z.infer<typeof publicKbArticleContract>;

export async function publicGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  contract?: ResponseContract<T>,
): Promise<T | null> {
  const url = new URL(`${BACKEND_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), withTraceContext({
    next: { revalidate: PUBLIC_REVALIDATE_SECS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }));
  if (res.status === 404) return null;
  return parseApiResponse<T>(res, contract, path);
}

export async function publicGetNoStore<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  contract?: ResponseContract<T>,
): Promise<T | null> {
  const url = new URL(`${BACKEND_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: withCorrelation(new Headers()),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  return parseApiResponse<T>(res, contract, path);
}

export type PublicApplicationStatus = z.infer<typeof publicApplicationStatusContract>;

export type PublicOffer = z.infer<typeof publicOfferDetailContract>;

export type PublicReferrerPortal = z.infer<typeof publicReferrerPortalContract>;

export type PublicVendorPortal = z.infer<typeof publicVendorPortalContract>;
