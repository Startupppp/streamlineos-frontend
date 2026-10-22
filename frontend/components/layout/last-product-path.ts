import type { ModuleKey } from "./sidebar/sidebar-nav-types";
import {
  getProductFromPathname,
  isPortalChromelessPath,
} from "./sidebar/sidebar-nav-items";

export const LAST_PRODUCT_PATHS_STORAGE = "last-product-paths";

export type LastProductPaths = Partial<Record<ModuleKey, string>>;

const SKIP_PREFIXES = [
  "/access-denied",
  "/signin",
  "/signup",
  "/org-setup",
  "/employee-onboarding",
  "/post-invite",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRelativeAppPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function parseLastProductPaths(raw: unknown): LastProductPaths {
  if (!isPlainObject(raw)) return {};
  const next: LastProductPaths = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !isRelativeAppPath(value)) continue;
    next[key as ModuleKey] = value;
  }
  return next;
}

export function readLastProductPaths(storageKey: string): LastProductPaths {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return {};
    return parseLastProductPaths(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function writeLastProductPath(
  storageKey: string,
  product: ModuleKey,
  href: string,
): void {
  if (typeof window === "undefined") return;
  if (!isRelativeAppPath(href)) return;
  const current = readLastProductPaths(storageKey);
  if (current[product] === href) return;
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ ...current, [product]: href }),
    );
  } catch {
    return;
  }
}

export function buildProductLocation(
  pathname: string,
  search: string,
): string {
  if (!search) return pathname;
  const query = search.startsWith("?") ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

export function shouldRememberProductPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (isPortalChromelessPath(pathname)) return false;
  return !SKIP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolveRememberedProductHref(
  product: ModuleKey,
  rememberedHref: string | undefined,
  fallbackHref: string,
): string {
  if (!rememberedHref || !isRelativeAppPath(rememberedHref)) return fallbackHref;
  const pathname = rememberedHref.split("?")[0] ?? "";
  if (!pathname || getProductFromPathname(pathname) !== product) {
    return fallbackHref;
  }
  return rememberedHref;
}
