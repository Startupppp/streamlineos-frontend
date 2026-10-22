import { hashKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";


export const LOADING_SCOPE = "loading";
export const UNAUTHENTICATED_SCOPE = "unauthenticated";

export function authenticatedScope(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): string {
  return `authenticated:${orgId ?? ""}:${userId ?? ""}`;
}

export function scopedQueryKeyHashFn(
  scope: string,
): (queryKey: QueryKey) => string {
  return (queryKey) => hashKey([scope, queryKey]);
}
