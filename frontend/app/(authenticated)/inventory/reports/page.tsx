"use client";

import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAccess, useCan } from "@/hooks/api/access";
import { INVENTORY_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-nav-groups-inventory";
import type {
  NavRoute,
  PermissionRequirement,
} from "@/components/layout/sidebar/sidebar-nav-types";
import type { AccessResponse } from "@/types/access";
import { cn } from "@/lib/utils";

const REPORTS_HREF = "/inventory/reports";
const REPORTS_READ = "inventory:reports:read";

const REPORT_ROUTES: readonly NavRoute[] =
  INVENTORY_NAV_GROUPS.flatMap((group) => group.routes).find(
    (route) => route.href === REPORTS_HREF,
  )?.children ?? [];

const REPORT_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "/inventory/reports/stock-summary":
    "Current stock levels across all products",
  "/inventory/reports/movements":
    "Receipts, shipments, adjustments and transfers, in order",
  "/inventory/reports/reorder": "Products below their reorder points",
  "/inventory/reports/slow-moving":
    "Stock on hand with no outbound activity in the window",
  "/inventory/reports/expiry": "Lots approaching or past their expiry date",
  "/inventory/reports/throughput":
    "Receiving, picking and shipping against SLA",
  "/inventory/reports/audit-trail":
    "Who changed which inventory record, and when",
  "/inventory/reports/allocation-overrides":
    "Every time an expiry rule was set aside for a lot, and the reason given",
};

function holds(
  access: AccessResponse | undefined,
  requirement: PermissionRequirement | undefined,
): boolean {
  if (!access) return false;
  if (access.isOrgOwner) return true;
  if (!requirement) return true;
  const keys = Array.isArray(requirement) ? requirement : [requirement];
  return keys.some((key) => key in access.scopes);
}

export default function InventoryReportsHubPage() {
  const access = useAccess();
  const canReadReports = useCan(REPORTS_READ);

  const open = REPORT_ROUTES.filter((route) =>
    holds(access.data, route.requiredPermission),
  );

  const denied = !canReadReports && open.length === 0;

  return (
    <PageWrapper
      title="Reports"
      subtitle="Inventory reporting — stock, movement, exposure and service level"
    >
      {access.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_ROUTES.map((route) => (
            <Skeleton key={route.href} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : access.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't work out which reports are open to you"
          description={getErrorMessage(access.error)}
          onRetry={() => void access.refetch()}
        />
      ) : denied ? (
        <NoPermissionState className="flex-1" permission={REPORTS_READ} />
      ) : open.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No reports open to you"
          description="Inventory reporting is on for this workspace, but none of its reports is granted to your role yet. Ask an administrator for the ones you need."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {open.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                CONTENT_PANEL_SOLID,
                "p-4 transition-all hover:border-primary/40 hover:shadow-md",
              )}
            >
              <span className="mb-1.5 flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </span>
              <span className="block text-xs text-muted-foreground">
                {REPORT_DESCRIPTIONS[href]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
