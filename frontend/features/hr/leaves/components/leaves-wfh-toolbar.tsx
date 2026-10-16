"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon, EllipsisIcon, HouseIcon, PlusIcon } from "@animateicons/react/lucide";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { LeavesSummaryStrip } from "./leaves-summary-strip";
import { useT } from "@/lib/i18n/i18n";

export interface LeavesWfhToolbarProps {
  isAdmin: boolean;
  totalAvailable: number;
  availableHint: string | undefined;
  pendingCount: number;
  approvedDays: number;
  myLeaveCount: number;
  totalPendingApprovals: number;
  activeTab: string;
  wfhStatusFilter: string;
  onWfhStatusFilterChange: (value: string) => void;
  canExport: boolean;
  exportNoun: string;
  onExport: () => void;
}

export function LeavesWfhToolbar({
  isAdmin,
  totalAvailable,
  availableHint,
  pendingCount,
  approvedDays,
  myLeaveCount,
  totalPendingApprovals,
  activeTab,
  wfhStatusFilter,
  onWfhStatusFilterChange,
  canExport,
  exportNoun,
  onExport,
}: LeavesWfhToolbarProps) {
  const t = useT();
  return (
    <>
      <LeavesSummaryStrip
        totalAvailable={totalAvailable}
        availableHint={availableHint}
        pendingCount={pendingCount}
        approvedDays={approvedDays}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TabsList className="w-full shrink-0 md:w-auto">
          <TabsTrigger value="my-leaves" className="gap-1.5 truncate">
            {t("timeOff.tabMyLeaves")}
            {myLeaveCount > 0 ? (
              <span className="text-xs tabular-nums opacity-70">{myLeaveCount}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="wfh" className="gap-1.5 truncate">
            {t("timeOff.tabWfh")}
          </TabsTrigger>
          {isAdmin ? (
            <TabsTrigger value="approvals" className="gap-1.5 truncate">
              Approvals
              {totalPendingApprovals > 0 ? (
                <span className="text-xs tabular-nums opacity-70">
                  {totalPendingApprovals}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {canExport ? (
            <AnimatedIconButton
              icon={DownloadIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-1.5"
              aria-label={`Export ${exportNoun}s to Excel`}
            >
              Export
            </AnimatedIconButton>
          ) : null}
          {activeTab === "wfh" ? (
            <Select value={wfhStatusFilter} onValueChange={onWfhStatusFilterChange}>
              <SelectTrigger
                className={`${FILTER_SELECT_TRIGGER} w-[130px]`}
                aria-label="Filter WFH requests by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>
    </>
  );
}

const LEAVE_LINKS: readonly { label: string; href: string; permission: PermissionKey }[] = [
  { label: "Leave types & policies", href: "/hr/leave-policies", permission: "hr:leaves:manage" },
  { label: "HR policies", href: "/hr/settings/policies", permission: "hr:policies:view" },
  { label: "Holiday calendar", href: "/hr/holidays", permission: "self:attendance" },
  { label: "Leave analytics", href: "/hr/leaves/analytics", permission: "hr:leaves:view" },
];

function LeaveLinksMenu() {
  const canManageLeaves = useCan("hr:leaves:manage");
  const canViewPolicies = useCan("hr:policies:view");
  const canSeeHolidays = useCan("self:attendance");
  const canViewLeaves = useCan("hr:leaves:view");
  const granted: Record<string, boolean> = {
    "hr:leaves:manage": canManageLeaves,
    "hr:policies:view": canViewPolicies,
    "self:attendance": canSeeHolidays,
    "hr:leaves:view": canViewLeaves,
  };
  const links = LEAVE_LINKS.filter((link) => granted[link.permission]);
  if (links.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="outline"
          size="icon"
          className="min-h-11 md:min-h-0"
          aria-label="Leave settings and reports"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeavesWfhActions({
  canRequestLeave,
  canRequestWfh,
  onRequestLeave,
  onRequestWfh,
}: {
  canRequestLeave: boolean;
  canRequestWfh: boolean;
  onRequestLeave: () => void;
  onRequestWfh: () => void;
}) {
  const t = useT();
  return (
    <>
      <LeaveLinksMenu />
      {canRequestWfh ? (
        <AnimatedIconButton
          icon={HouseIcon}
          iconSize={14}
          iconClassName="mr-1.5"
          variant="outline"
          size="sm"
          onClick={onRequestWfh}
          className="min-h-11 gap-1.5 md:min-h-0"
        >
          {t("timeOff.requestWfh")}
        </AnimatedIconButton>
      ) : null}
      {canRequestLeave ? (
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1.5"
          size="sm"
          onClick={onRequestLeave}
          className="min-h-11 gap-1.5 md:min-h-0"
        >
          {t("timeOff.requestLeave")}
        </AnimatedIconButton>
      ) : null}
    </>
  );
}
