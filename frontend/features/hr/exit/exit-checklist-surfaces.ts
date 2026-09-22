import type { ComponentType } from "react";
import {
  Briefcase,
  ClipboardCheck,
  FileCheck2,
  FileText,
  KeyRound,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Wallet,
} from "lucide-react";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { ExitChecklistKind, ExitChecklistQueue, ExitChecklistStatus } from "@/hooks/api/hr/exit-schema";

export interface ExitChecklistSurface {
  href: string;
  label: string;
  permission: PermissionKey;
}

const SURFACE_BY_KIND: Partial<Record<ExitChecklistKind, ExitChecklistSurface>> = {
  asset_return: { href: "/hr/asset-returns", label: "Open asset returns", permission: "hr:assets:view" },
  it_access_removal: { href: "/hr/identity", label: "Open identity & access", permission: "hr:identity:view" },
  final_settlement: { href: "/hr/fnf", label: "Open final settlement", permission: "hr:payroll:approve" },
};

export function exitChecklistSurface(kind: ExitChecklistKind): ExitChecklistSurface | null {
  return SURFACE_BY_KIND[kind] ?? null;
}

export const EXIT_CHECKLIST_KIND_ICONS: Record<ExitChecklistKind, ComponentType<{ className?: string }>> = {
  manager_handover: Briefcase,
  hr_clearance: ClipboardCheck,
  it_access_removal: KeyRound,
  asset_return: PackageCheck,
  final_settlement: Wallet,
  documents: FileText,
  exit_interview: MessageSquareText,
  completion_evidence: FileCheck2,
  custom: ListChecks,
};

export const EXIT_CHECKLIST_STATUS_LABELS: Record<ExitChecklistStatus, string> = {
  PENDING: "Open",
  DONE: "Done",
  WAIVED: "Not applicable",
};

export const EXIT_CHECKLIST_STATUS_TONES: Record<ExitChecklistStatus, BadgeTone> = {
  PENDING: "warning",
  DONE: "success",
  WAIVED: "neutral",
};

export const EXIT_CHECKLIST_QUEUE_LABELS: Record<ExitChecklistQueue, string> = {
  "hr:exit:manage": "HR exits queue",
  "hr:identity:manage": "Identity & access queue",
  "hr:assets:manage": "Assets queue",
  "hr:payroll:approve": "Final settlement queue",
};

export function isExitChecklistOverdue(status: ExitChecklistStatus, dueDate: string | null, today: string): boolean {
  return status === "PENDING" && dueDate !== null && dueDate < today;
}
