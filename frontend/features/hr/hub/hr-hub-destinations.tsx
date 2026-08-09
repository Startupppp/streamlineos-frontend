"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccess } from "@/hooks/api/access";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import {
  getNavGroupsForProduct,
  type NavRoute,
} from "@/components/layout/sidebar/sidebar-nav-items";
import { HrSectionHeader } from "@/features/hr/shared/hr-ui";

const SKIP_HREFS = new Set([
  "/hr",
  "/hr/access",
  "/hr/settings/import-export",
  "/hr/identity",
  "/hr/approvals",
]);

const TONE_MAP: Record<string, string> = {
  "/hr/employees": "blue",
  "/hr/attendance": "emerald",
  "/hr/leaves": "amber",
  "/hr/benefits": "sky",
  "/hr/expenses": "amber",
  "/hr/performance": "rose",
  "/hr/documents": "slate",
  "/hr/assets": "slate",
  "/hr/workforce": "blue",
  "/hr/cases": "amber",
  "/hr/compliance": "rose",
  "/hr/exit": "slate",
  "/hr/analytics": "blue",
  "/hr/recruitment": "blue",
};

const TILE_BG: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  slate: "bg-muted text-muted-foreground",
};

interface DestTileProps {
  route: NavRoute;
}

function DestTile({ route }: DestTileProps) {
  const Icon = route.icon;
  const tone = TONE_MAP[route.href] ?? "slate";
  const iconBg = TILE_BG[tone];

  return (
    <Link
      href={route.href}
      className="group flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{route.label}</p>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
        </div>
      </div>
    </Link>
  );
}

export function HrHubDestinations() {
  const { data: access } = useAccess();
  const enabledModules = useEnabledModules();

  const visible = useMemo(() => {
    if (!access) return [];

    const groups = getNavGroupsForProduct(
      "hrms",
      access.isOrgOwner ? "OWNER" : "MEMBER",
      access.permissions,
      enabledModules,
    );
    const peopleRoutes =
      groups.find((group) => group.label.includes("People"))?.routes ?? [];
    const recruitmentRoutes =
      groups.find((group) => group.label === "Recruitment")?.routes ?? [];
    const recruitmentRoute =
      recruitmentRoutes.find((route) => route.href === "/hr/recruitment") ??
      recruitmentRoutes[0];

    return [
      ...peopleRoutes.filter((route) => !SKIP_HREFS.has(route.href)),
      ...(recruitmentRoute
        ? [{ ...recruitmentRoute, label: "Recruitment" }]
        : []),
    ];
  }, [access, enabledModules]);

  if (!access) return null;

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <HrSectionHeader title="Quick navigation" description="Jump to any HR area you have access to" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {visible.map((route) => (
          <DestTile key={route.href} route={route} />
        ))}
      </div>
    </div>
  );
}
