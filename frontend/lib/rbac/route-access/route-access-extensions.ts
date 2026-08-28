import type {
  PermissionRequirement,
  ProductKey,
} from "@/components/layout/sidebar/sidebar-nav-types";

export interface RouteAccessExtension {
  readonly prefix: string;
  readonly exact?: boolean;
  readonly product?: ProductKey;
  readonly permission?: PermissionRequirement;
  readonly reason: string;
}

export const ROUTE_ACCESS_EXTENSIONS: readonly RouteAccessExtension[] = [
  {
    prefix: "/billing/invoices",
    product: "finance",
    permission: "accounting:receivables:read",
    reason:
      "The organization's own customer invoicing is an Accounting surface even though the route sits under /billing. Navigation has no entry for it.",
  },
  {
    prefix: "/portal",
    product: "build",
    permission: "build:portal:view",
    reason:
      "The client portal renders delivery work under project ids that navigation cannot enumerate.",
  },
  {
    prefix: "/ai/executive-brief",
    permission: "ai:executive-brief:view",
    reason:
      "Matches the backend gate on GET /ai/executive-brief. The surface has no navigation entry.",
  },
  {
    prefix: "/ask",
    permission: "kb:pages:view",
    reason:
      "Matches the backend gate on the KB ask endpoints. Knowledge Base reading is a member default, so this denies nobody who keeps platform core.",
  },
  {
    prefix: "/blog/access",
    permission: "blog:access:view",
    reason:
      "Module access administration for Blog, which has no product navigation entry.",
  },
  {
    prefix: "/subjects",
    permission: "party:subjects:view",
    reason:
      "Business subjects surface reached from Party, with no navigation entry of its own.",
  },
];

export function matchRouteAccessExtension(
  pathname: string,
): RouteAccessExtension | null {
  let best: RouteAccessExtension | null = null;
  for (const entry of ROUTE_ACCESS_EXTENSIONS) {
    const owns = entry.exact
      ? pathname === entry.prefix
      : pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`);
    if (!owns) continue;
    if (!best || entry.prefix.length > best.prefix.length) best = entry;
  }
  return best;
}
