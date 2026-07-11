"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KIND_LABELS, STATUS_LABELS, type HrTemplateKind, type HrTemplateStatus } from "@/types/hr/templates";

const KIND_COLORS: Record<HrTemplateKind, string> = {
  onboarding_checklist: "bg-emerald-100 text-emerald-700 border-emerald-200",
  offboarding_checklist: "bg-orange-100 text-orange-700 border-orange-200",
  probation_review: "bg-blue-100 text-blue-700 border-blue-200",
  performance_review: "bg-violet-100 text-violet-700 border-violet-200",
  goal: "bg-yellow-100 text-yellow-700 border-yellow-200",
  letter: "bg-slate-100 text-slate-700 border-slate-200",
  document_request: "bg-pink-100 text-pink-700 border-pink-200",
  email: "bg-sky-100 text-sky-700 border-sky-200",
  notification: "bg-indigo-100 text-indigo-700 border-indigo-200",
  survey: "bg-teal-100 text-teal-700 border-teal-200",
  training: "bg-cyan-100 text-cyan-700 border-cyan-200",
  asset_assignment: "bg-amber-100 text-amber-700 border-amber-200",
  exit_interview: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_COLORS: Record<HrTemplateStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

export function KindBadge({ kind }: { kind: HrTemplateKind }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5", KIND_COLORS[kind])}>
      {KIND_LABELS[kind]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: HrTemplateStatus }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium px-1.5", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
