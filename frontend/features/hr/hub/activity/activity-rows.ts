import type { AgingBucket } from "@/hooks/api/hr/service-delivery";
import { getUserDisplayName } from "@/features/build/shared/resolve-user-name";
import { Clock, UserMinus, ShieldAlert, MessageSquare, Inbox } from "lucide-react";

export const BUCKET_SCORE: Record<AgingBucket, number> = {
  critical: 40,
  overdue: 30,
  watch: 18,
  fresh: 10,
};

export type OpsRow = {
  kind: "ops";
  urgency: number;
  id: number;
  ref: string;
  title: string;
  subKind: "case" | "safety_incident" | "helpdesk";
  href: string;
  ageDays: number;
  slaBreached: boolean;
  status: string;
};

export type ProbationRow = {
  kind: "probation";
  urgency: number;
  id: number;
  name: string;
  dueDate: string;
  href: string;
};

export type ResignationRow = {
  kind: "resignation";
  urgency: number;
  id: number;
  name: string;
  lastDay: string | null;
  status: string | null;
  href: string;
};

export type ActivityRow = OpsRow | ProbationRow | ResignationRow;

export function kindIcon(row: ActivityRow) {
  if (row.kind === "probation") return Clock;
  if (row.kind === "resignation") return UserMinus;
  if (row.subKind === "safety_incident") return ShieldAlert;
  if (row.subKind === "helpdesk") return MessageSquare;
  return Inbox;
}

export function kindTone(
  row: ActivityRow,
): "rose" | "amber" | "blue" | "slate" {
  if (row.kind === "probation") return "amber";
  if (row.kind === "resignation") return "slate";
  if (row.kind === "ops" && row.subKind === "safety_incident") return "rose";
  if (row.kind === "ops" && row.slaBreached) return "rose";
  return "blue";
}

export function sourceBadgeLabel(row: ActivityRow): string {
  if (row.kind === "probation") return "Probation";
  if (row.kind === "resignation") return "Exit";
  if (row.subKind === "safety_incident") return "Safety";
  if (row.subKind === "helpdesk") return "Helpdesk";
  return "Case";
}

export function ageBadge(row: ActivityRow): string {
  if (row.kind === "ops") {
    if (row.slaBreached) return "SLA breached";
    if (row.ageDays === 0) return "Today";
    return `${row.ageDays}d old`;
  }
  if (row.kind === "probation")
    return `Due ${new Date(row.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
  if (row.kind === "resignation" && row.lastDay)
    return new Date(row.lastDay).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return "";
}

export function primaryText(row: ActivityRow): string {
  if (row.kind === "ops") return row.title;
  if (row.kind === "probation") return row.name;
  return row.name;
}

export function secondaryText(row: ActivityRow): string {
  if (row.kind === "ops") return `${row.ref} · ${row.status}`;
  if (row.kind === "probation") return "Probation review due";
  return row.lastDay
    ? `Last day ${new Date(row.lastDay).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
    : "Exit in progress";
}

interface OpsItem {
  aging: { bucket: AgingBucket; slaBreached: boolean; ageDays: number };
  id: number;
  ref: string;
  title: string;
  kind: "case" | "safety_incident" | "helpdesk";
  href: string;
  status: string;
}

interface ProbationItem {
  id: number;
  status: string;
  probationEndDate: string;
  firstName: string;
  lastName: string;
}

interface ResignationItem {
  id: number;
  status: string | null;
  user?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  lastWorkingDate: string | null;
}

export interface BuildActivityRowsInput {
  canCases: boolean;
  canProbation: boolean;
  canExit: boolean;
  opsItems: OpsItem[];
  probationItems: ProbationItem[];
  resignationItems: ResignationItem[];
}

export function buildActivityRows(input: BuildActivityRowsInput): ActivityRow[] {
  const { canCases, canProbation, canExit, opsItems, probationItems, resignationItems } = input;
  const merged: ActivityRow[] = [];

  if (canCases)
    for (const item of opsItems.slice(0, 6))
      merged.push({
        kind: "ops",
        urgency: BUCKET_SCORE[item.aging.bucket] + (item.aging.slaBreached ? 5 : 0),
        id: item.id,
        ref: item.ref,
        title: item.title,
        subKind: item.kind,
        href: item.href,
        ageDays: item.aging.ageDays,
        slaBreached: item.aging.slaBreached,
        status: item.status,
      });

  if (canProbation)
    for (const r of probationItems.filter((p) => p.status === "review_due").slice(0, 3)) {
      const daysUntil = Math.ceil(
        (new Date(r.probationEndDate).getTime() - Date.now()) / 86400000,
      );
      merged.push({
        kind: "probation",
        urgency: daysUntil <= 0 ? 32 : daysUntil <= 3 ? 28 : 22,
        id: r.id,
        name: getUserDisplayName({ firstName: r.firstName, lastName: r.lastName }),
        dueDate: r.probationEndDate,
        href: "/hr/onboarding/probation",
      });
    }

  if (canExit)
    for (const r of resignationItems.slice(0, 3))
      merged.push({
        kind: "resignation",
        urgency:
          r.status === "SUBMITTED" || r.status === "PENDING_HR"
            ? 22
            : r.status === "IN_PROGRESS"
              ? 15
              : 8,
        id: r.id,
        name: getUserDisplayName(r.user ?? null),
        lastDay: r.lastWorkingDate,
        status: r.status,
        href: "/hr/exit",
      });

  return merged
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 8);
}
