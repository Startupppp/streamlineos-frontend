"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type {
  ManagerState,
  PrimaryReportingLineEntry,
  RelationshipEntry,
  ReportingLineSource,
} from "@/hooks/api/hr/reporting-lines-schema";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const MANAGER_STATE_LABEL: Record<ManagerState, { label: string; tone: StatusTone }> = {
  active: { label: "Active", tone: "success" },
  "on-notice": { label: "On notice", tone: "warning" },
  inactive: { label: "Inactive", tone: "danger" },
  exited: { label: "Exited", tone: "danger" },
};

export const SOURCE_LABEL: Record<ReportingLineSource, string> = {
  MANUAL: "Set by HR",
  MIGRATED: "Existing record",
  ONBOARDING_SELECTED: "Chosen at onboarding",
  ONBOARDING_FALLBACK: "Assigned by onboarding policy",
  BULK_ONBOARDING: "Bulk onboarding",
  STAGED_IMPORT: "Employee import",
  EMPLOYEE_REQUEST: "Employee review request",
  BULK_REASSIGNMENT: "Bulk reporting change",
  EMERGENCY_OVERRIDE: "Emergency change",
  EFFECTIVE_CHANGE: "Scheduled change",
};

function ManagerStateBadge({ state }: { state: ManagerState }) {
  const { label, tone } = MANAGER_STATE_LABEL[state];
  const classes = statusToneClasses(tone);
  return (
    <Badge variant="outline" className={cn("h-5 px-2 py-0.5 text-micro", classes.surface, classes.ink, classes.rule)}>
      {label}
    </Badge>
  );
}

interface RowShellProps {
  label: string;
  userId: string | null;
  name: string;
  designation: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  source?: ReportingLineSource;
  state: ManagerState;
  badges?: ReactNode;
  actions?: ReactNode;
}

function RowShell({ label, userId, name, designation, effectiveFrom, effectiveTo, source, state, badges, actions }: RowShellProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {userId ? (
              <Link href={`/hr/employees/${userId}`} className="text-sm font-medium text-primary hover:underline">
                {name}
              </Link>
            ) : (
              <span className="text-sm font-medium">{name}</span>
            )}
            {badges}
          </div>
          <p className="text-dense text-muted-foreground">
            {designation ? `${designation} · ` : ""}
            from <span className="font-mono">{formatShortDate(effectiveFrom)}</span>
            {effectiveTo ? (
              <>
                {" "}
                to <span className="font-mono">{formatShortDate(effectiveTo)}</span>
              </>
            ) : null}
            {source ? ` · ${SOURCE_LABEL[source]}` : ""}
          </p>
        </div>
        <ManagerStateBadge state={state} />
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

interface PrimaryLineRowProps {
  entry: PrimaryReportingLineEntry;
  label: string;
  badges?: ReactNode;
  actions?: ReactNode;
}

export function PrimaryLineRow({ entry, label, badges, actions }: PrimaryLineRowProps) {
  return (
    <RowShell
      label={label}
      userId={entry.managerUserId}
      name={entry.managerName ?? entry.managerEmail ?? "Unnamed manager"}
      designation={entry.managerDesignation}
      effectiveFrom={entry.effectiveFrom}
      effectiveTo={entry.effectiveTo}
      source={entry.source}
      state={entry.managerState}
      badges={badges}
      actions={actions}
    />
  );
}

export function RelationshipRow({ entry, label, badges }: { entry: RelationshipEntry; label: string; badges?: ReactNode }) {
  return (
    <RowShell
      label={label}
      userId={entry.manager.userId}
      name={entry.manager.name}
      designation={entry.manager.designation}
      effectiveFrom={entry.effectiveFrom}
      effectiveTo={entry.effectiveTo}
      source={entry.source}
      state={entry.manager.state}
      badges={badges}
    />
  );
}
