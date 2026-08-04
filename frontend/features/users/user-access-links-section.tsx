"use client";

import Link from "next/link";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { PermissionKey } from "@/lib/rbac/permissions";

const MODULE_ACCESS_LINKS = [
  { key: "hr", label: "HR", permission: "hr:access:view" as PermissionKey },
  { key: "crm", label: "CRM", permission: "crm:access:view" as PermissionKey },
  { key: "build", label: "Build", permission: "build:access:view" as PermissionKey },
  { key: "accounting", label: "Accounting", permission: "accounting:access:view" as PermissionKey },
  { key: "inventory", label: "Inventory", permission: "inventory:access:view" as PermissionKey },
  { key: "support", label: "Support", permission: "support:access:view" as PermissionKey },
  { key: "surveys", label: "Surveys", permission: "surveys:access:view" as PermissionKey },
  { key: "payroll", label: "Payroll", permission: "payroll:access:view" as PermissionKey },
  { key: "sign", label: "SignOS", permission: "sign:access:view" as PermissionKey },
  { key: "timesheets", label: "Timesheets", permission: "timesheets:access:view" as PermissionKey },
] as const;

interface ModuleLinkEntry {
  key: string;
  label: string;
}

interface AccessNavRowProps {
  href: string;
  label: string;
  description?: string;
}

function AccessNavRow({ href, label, description }: AccessNavRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Link
      href={href}
      className="group flex min-h-9 items-center justify-between gap-3 py-1.5 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      {...hoverHandlers}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-normal leading-tight">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground leading-tight">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRightIcon
        ref={iconRef}
        size={14}
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
      />
    </Link>
  );
}

interface UserAccessLinksSectionProps {
  userId?: string;
}

export function UserAccessLinksSection({ userId }: UserAccessLinksSectionProps) {
  const canManageRbac = useCan("settings:rbac:manage");
  const canViewHr = useCan("hr:access:view");
  const canViewCrm = useCan("crm:access:view");
  const canViewBuild = useCan("build:access:view");
  const canViewAccounting = useCan("accounting:access:view");
  const canViewInventory = useCan("inventory:access:view");
  const canViewSupport = useCan("support:access:view");
  const canViewSurveys = useCan("surveys:access:view");
  const canViewPayroll = useCan("payroll:access:view");
  const canViewSign = useCan("sign:access:view");
  const canViewTimesheets = useCan("timesheets:access:view");

  const hrEnabled = useModuleEnabled("hr");
  const crmEnabled = useModuleEnabled("crm");
  const buildEnabled = useModuleEnabled("build");
  const accountingEnabled = useModuleEnabled("accounting");
  const inventoryEnabled = useModuleEnabled("inventory");
  const supportEnabled = useModuleEnabled("support");
  const surveysEnabled = useModuleEnabled("surveys");
  const payrollEnabled = useModuleEnabled("payroll");
  const signEnabled = useModuleEnabled("sign");
  const timesheetsEnabled = useModuleEnabled("timesheets");

  const canMap: Record<string, boolean> = {
    hr: canViewHr && hrEnabled,
    crm: canViewCrm && crmEnabled,
    build: canViewBuild && buildEnabled,
    accounting: canViewAccounting && accountingEnabled,
    inventory: canViewInventory && inventoryEnabled,
    support: canViewSupport && supportEnabled,
    surveys: canViewSurveys && surveysEnabled,
    payroll: canViewPayroll && payrollEnabled,
    sign: canViewSign && signEnabled,
    timesheets: canViewTimesheets && timesheetsEnabled,
  };

  const visibleModules: ModuleLinkEntry[] = MODULE_ACCESS_LINKS.filter(
    ({ key }) => canMap[key],
  ).map(({ key, label }) => ({ key, label }));

  if (!canManageRbac && visibleModules.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Access management
      </p>
      <p className="text-[11px] text-muted-foreground">
        Manage org-wide roles here, then assign module roles where this person works.
      </p>

      {canManageRbac && (
        <div className="pt-1">
          <AccessNavRow
            href="/settings/roles"
            label="Roles & Permissions"
            description="Org-wide roles and custom grants"
          />
        </div>
      )}

      {visibleModules.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-[11px] text-muted-foreground">Module roles</p>
          <div>
            {visibleModules.map((entry) => {
              const href = userId
                ? `/${entry.key}/access?userId=${encodeURIComponent(userId)}`
                : `/${entry.key}/access`;
              return (
                <AccessNavRow key={entry.key} href={href} label={entry.label} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
