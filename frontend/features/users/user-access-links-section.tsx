"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "@animateicons/react/lucide";
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

function RbacRolesBlock() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 space-y-2">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Custom roles define what this person can see and do. A member invited as
        &ldquo;Member&rdquo; has no resource-level access until assigned at least one custom role.
      </p>
      <Link
        href="/settings/roles"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        {...hoverHandlers}
      >
        Roles &amp; Permissions
        <ExternalLinkIcon ref={iconRef} size={11} />
      </Link>
    </div>
  );
}

function ModuleAccessBadge({ entry }: { entry: ModuleLinkEntry }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Link
      href={`/${entry.key}/access`}
      className="inline-flex items-center gap-1 rounded border border-border/60 bg-card px-2 py-1 text-[11px] text-foreground hover:bg-muted/40 transition-colors"
      {...hoverHandlers}
    >
      {entry.label}
      <ExternalLinkIcon ref={iconRef} size={9} />
    </Link>
  );
}

export function UserAccessLinksSection() {
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
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Access management
      </p>

      {canManageRbac && <RbacRolesBlock />}

      {visibleModules.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground">
            Assign module-level roles at:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleModules.map((entry) => (
              <ModuleAccessBadge key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
